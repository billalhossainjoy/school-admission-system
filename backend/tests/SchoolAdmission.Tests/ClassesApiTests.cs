using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Controllers;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Models;
using SchoolAdmission.Api.Requests;

namespace SchoolAdmission.Tests;

public sealed class ClassesControllerTests(PostgreSqlFixture fixture)
    : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private AppDbContext db = null!;
    private ClassesController controller = null!;

    public async Task InitializeAsync()
    {
        db = await fixture.CreateDbContextAsync();
        controller = new ClassesController(db);
    }

    public async Task DisposeAsync()
    {
        await db.DisposeAsync();
    }

    [Fact]
    public async Task CreateClass_returns_created_result_and_persists_class()
    {
        var result = await controller.CreateClass(new CreateClassRequestDto
        {
            Name = " Class 1 ",
            TotalSeats = 30
        });

        var created = Assert.IsType<CreatedResult>(result);
        Assert.Equal(201, created.StatusCode);

        var admissionClass = await db.Classes.SingleAsync();
        Assert.Equal("Class 1", admissionClass.Name);
        Assert.Equal(30, admissionClass.TotalSeats);
        Assert.Equal($"/classes/{admissionClass.Id}", created.Location);
    }

    [Fact]
    public async Task GetClasses_returns_classes_with_seat_counts()
    {
        var admissionClass = new AdmissionClass
        {
            Name = "Class 1",
            TotalSeats = 30
        };
        admissionClass.Holds.Add(new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "student-held",
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });
        admissionClass.Holds.Add(new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "student-confirmed",
            Status = "CONFIRMED",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-10)
        });
        db.Classes.Add(admissionClass);
        await db.SaveChangesAsync();

        var result = await controller.GetClasses();

        var ok = Assert.IsType<OkObjectResult>(result);
        var classes = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value);
        var classResult = Assert.Single(classes);
        Assert.Equal(admissionClass.Id, classResult.GetType().GetProperty("Id")?.GetValue(classResult));
        Assert.Equal(1, classResult.GetType().GetProperty("HeldSeats")?.GetValue(classResult));
        Assert.Equal(1, classResult.GetType().GetProperty("ConfirmedSeats")?.GetValue(classResult));
        Assert.Equal(28, classResult.GetType().GetProperty("AvailableSeats")?.GetValue(classResult));
    }

    [Fact]
    public async Task GetClass_returns_class_when_id_exists()
    {
        var admissionClass = new AdmissionClass
        {
            Name = "Class 1",
            TotalSeats = 30
        };
        db.Classes.Add(admissionClass);
        await db.SaveChangesAsync();

        var result = await controller.GetClass(admissionClass.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetClass_returns_not_found_when_id_does_not_exist()
    {
        var result = await controller.GetClass("missing-class");

        Assert.IsType<NotFoundResult>(result);
    }
}
