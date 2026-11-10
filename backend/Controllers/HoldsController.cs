
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
        if (!IsValidStudentId(studentId))
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
            return BadRequest(new
            {
                error = "Hold duration must be greater than zero."
            });
        }

        await using var transaction =
            await db.Database.BeginTransactionAsync();

        var admissionClass = await LockClassAsync(classId);

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
            StudentId = studentId!,
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

    [HttpGet("/holds/{holdId}")]
    public async Task<IActionResult> GetHold(
        [FromRoute] string holdId)
    {
        var hold = await db.Holds
            .AsNoTracking()
            .Where(h => h.Id == holdId)
            .Select(h => new
            {
                holdId = h.Id,
                classId = h.ClassId,
                status = h.Status,
                expiresAt = h.ExpiresAt
            })
            .FirstOrDefaultAsync();

        if (hold is null)
            return NotFound(new { error = "Hold not found." });

        return Ok(hold);
    }

    [HttpPost("/holds/{holdId}/confirm")]
    public async Task<IActionResult> ConfirmHold(
        [FromRoute] string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (!IsValidStudentId(studentId))
        {
            return BadRequest(new
            {
                error = "Student ID must contain exactly 17 digits."
            });
        }

        var classId = await db.Holds
            .AsNoTracking()
            .Where(h => h.Id == holdId)
            .Select(h => h.ClassId)
            .FirstOrDefaultAsync();

        if (classId is null)
            return NotFound(new { error = "Hold not found." });

        await using var transaction =
            await db.Database.BeginTransactionAsync();

        var admissionClass = await LockClassAsync(classId);

        if (admissionClass is null)
            return NotFound(new { error = "Class not found." });

        var hold = await db.Holds
            .SingleOrDefaultAsync(h => h.Id == holdId);

        if (hold is null)
            return NotFound(new { error = "Hold not found." });

        if (hold.StudentId != studentId)
            return Forbid();

        if (hold.Status == "CONFIRMED")
        {
            await transaction.CommitAsync();

            return Ok(new
            {
                holdId = hold.Id,
                status = hold.Status
            });
        }

        if (hold.Status != "HELD")
        {
            return Conflict(new
            {
                error = "This hold cannot be confirmed."
            });
        }

        if (hold.ExpiresAt <= DateTime.UtcNow)
        {
            hold.Status = "EXPIRED";

            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Conflict(new
            {
                error = "This hold has expired."
            });
        }

        hold.Status = "CONFIRMED";

        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            holdId = hold.Id,
            status = hold.Status
        });
    }

    [HttpDelete("/holds/{holdId}")]
    public async Task<IActionResult> CancelHold(
        [FromRoute] string holdId,
        [FromHeader(Name = "X-Student-Id")] string? studentId)
    {
        if (!IsValidStudentId(studentId))
        {
            return BadRequest(new
            {
                error = "Student ID must contain exactly 17 digits."
            });
        }

        var classId = await db.Holds
            .AsNoTracking()
            .Where(h => h.Id == holdId)
            .Select(h => h.ClassId)
            .FirstOrDefaultAsync();

        if (classId is null)
            return NotFound(new { error = "Hold not found." });

        await using var transaction =
            await db.Database.BeginTransactionAsync();

        var admissionClass = await LockClassAsync(classId);

        if (admissionClass is null)
            return NotFound(new { error = "Class not found." });

        var hold = await db.Holds
            .SingleOrDefaultAsync(h => h.Id == holdId);

        if (hold is null)
            return NotFound(new { error = "Hold not found." });

        if (hold.StudentId != studentId)
            return Forbid();

        if (hold.Status == "CANCELLED" ||
            hold.Status == "EXPIRED")
        {
            await transaction.CommitAsync();
            return NoContent();
        }

        if (hold.Status == "HELD" &&
            hold.ExpiresAt <= DateTime.UtcNow)
        {
            hold.Status = "EXPIRED";

            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }

        if (hold.Status != "HELD" &&
            hold.Status != "CONFIRMED")
        {
            return Conflict(new
            {
                error = "This hold cannot be cancelled."
            });
        }

        hold.Status = "CANCELLED";

        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }

    private async Task<AdmissionClass?> LockClassAsync(string classId)
    {
        return await db.Classes
            .FromSqlInterpolated(
                $"""SELECT * FROM classes WHERE "Id" = {classId} FOR UPDATE""")
            .SingleOrDefaultAsync();
    }

    private static bool IsValidStudentId(string? studentId)
    {
        return studentId is { Length: 17 } &&
            studentId.All(c => c is >= '0' and <= '9');
    }

    
}
