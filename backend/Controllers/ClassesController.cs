
using Microsoft.AspNetCore.Mvc;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Models;
using SchoolAdmission.Api.Requests;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateClass(
        [FromBody] CreateClassRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            request.TotalSeats <= 0)
        {
            return BadRequest(new
            {
                error = "Name is required and totalSeats must be positive."
            });
        }

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
}
