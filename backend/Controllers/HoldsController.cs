
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Models;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
public class HoldsController(
    AppDbContext db,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("/classes/{classId}/holds")]
    public async Task<IActionResult> CreateHold(
        [FromRoute] string classId,
        [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (string.IsNullOrEmpty(studentId) ||
            studentId.Length != 17 ||
            !studentId.All(c => c is >= '0' and <= '9'))
        {
            return BadRequest(new
            {
                error = "Student ID must contain exactly 17 digits."
            });
        }

        var duration = configuration.GetValue<int?>(
            "HOLD_DURATION_SECONDS") ?? 600;

        if (duration <= 0)
        {
            throw new InvalidOperationException(
                "HOLD_DURATION_SECONDS must be greater than zero.");
        }


        await using var transaction =
            await db.Database.BeginTransactionAsync();


        var admissionClass = await db.Classes
            .FromSqlInterpolated(
                $"""SELECT * FROM classes WHERE "Id" = {classId} FOR UPDATE""")
            .SingleOrDefaultAsync();

        if (admissionClass is null)
            return NotFound(new { error = "Class not found." });

        var now = DateTime.UtcNow;


        await db.Holds
            .Where(h =>
                h.ClassId == classId &&
                h.Status == "HELD" &&
                h.ExpiresAt <= now)
            .ExecuteUpdateAsync(setters =>
                setters.SetProperty(h => h.Status, "EXPIRED"));


        var alreadyApplied = await db.Holds.AnyAsync(h =>
            h.ClassId == classId &&
            h.StudentId == studentId &&
            (h.Status == "HELD" || h.Status == "CONFIRMED"));

        if (alreadyApplied)
        {
            return Conflict(new
            {
                error = "You already have an active or confirmed application."
            });
        }


        var occupiedSeats = await db.Holds.CountAsync(h =>
            h.ClassId == classId &&
            (h.Status == "HELD" || h.Status == "CONFIRMED"));

        if (occupiedSeats >= admissionClass.TotalSeats)
        {
            return Conflict(new
            {
                error = "No seats available."
            });
        }

        var hold = new AdmissionHold
        {
            ClassId = classId,
            StudentId = studentId,
            Status = "HELD",
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(duration)
        };

        db.Holds.Add(hold);

        await db.SaveChangesAsync();

        await transaction.CommitAsync();

        return Created($"/holds/{hold.Id}", new
        {
            holdId = hold.Id,
            classId = hold.ClassId,
            studentId = hold.StudentId,
            status = hold.Status,
            expiresAt = hold.ExpiresAt
        });
    }
}
