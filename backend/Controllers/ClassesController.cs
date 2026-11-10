
using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Models;
using SchoolAdmission.Api.Requests;
using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateClass(
        [FromBody] CreateClassRequestDto request)
    {
        var admissionClass = new AdmissionClass
        {
            Name = request.Name.Trim(),
            TotalSeats = request.TotalSeats
        };

        db.Classes.Add(admissionClass);
        await db.SaveChangesAsync();

        return Created($"/classes/{admissionClass.Id}", new
        {
            admissionClass.Id,
            admissionClass.Name,
            admissionClass.TotalSeats
        });
    }


    [HttpGet]
    public async Task<IActionResult> GetClasses()
    {
        var now = DateTime.UtcNow;

        var classes = await db.Classes
            .AsNoTracking()
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.TotalSeats,

                HeldSeats = c.Holds.Count(h =>
                    h.Status == "HELD" &&
                    h.ExpiresAt > now),

                ConfirmedSeats = c.Holds.Count(h =>
                    h.Status == "CONFIRMED"),

                AvailableSeats = c.TotalSeats -
                    c.Holds.Count(h =>
                        h.Status == "CONFIRMED" ||
                        (h.Status == "HELD" && h.ExpiresAt > now))
            })
            .ToListAsync();

        return Ok(classes);
    }


    [HttpGet("{classId}")]
    public async Task<IActionResult> GetClass([FromRoute] string classId)
    {
        var now = DateTime.UtcNow;

        var admissionClass = await db.Classes
            .AsNoTracking()
            .Where(c => c.Id == classId)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.TotalSeats,
                HeldSeats = c.Holds.Count(h =>
                    h.Status == "HELD" && h.ExpiresAt > now),
                ConfirmedSeats = c.Holds.Count(h =>
                    h.Status == "CONFIRMED"),
                AvailableSeats = c.TotalSeats - c.Holds.Count(h =>
                    h.Status == "CONFIRMED" ||
                    (h.Status == "HELD" && h.ExpiresAt > now))
            })
            .FirstOrDefaultAsync();

        if (admissionClass is null)
            return NotFound();

        return Ok(admissionClass);
    }


}
