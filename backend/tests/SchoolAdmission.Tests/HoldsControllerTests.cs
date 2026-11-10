
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SchoolAdmission.Api.Controllers;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Models;

namespace SchoolAdmission.Tests;

// The fixture resets the database before each test.
// Keep these tests sequential to avoid database reset conflicts.
[CollectionDefinition("Hold PostgreSQL tests", DisableParallelization = true)]
public sealed class HoldPostgreSqlCollection;

[Collection("Hold PostgreSQL tests")]
public sealed class HoldsControllerTests(PostgreSqlFixture fixture)
    : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private AppDbContext db = null!;
    private HoldsController controller = null!;

    public async Task InitializeAsync()
    {
        db = await fixture.CreateDbContextAsync();
        controller = CreateController();
    }

    public async Task DisposeAsync()
    {
        await db.DisposeAsync();
    }

    private HoldsController CreateController(int? duration = null)
    {
        var configuration = new ConfigurationManager();

        if (duration.HasValue)
            configuration["HOLD_DURATION_SECONDS"] = duration.Value.ToString();

        return new HoldsController(db, configuration);
    }

    private async Task<AdmissionClass> CreateClassAsync(int totalSeats = 30)
    {
        var admissionClass = new AdmissionClass
        {
            Name = "Class 6 - Morning",
            TotalSeats = totalSeats
        };

        db.Classes.Add(admissionClass);
        await db.SaveChangesAsync();

        return admissionClass;
    }

    [Fact]
    public async Task CreateHold_returns_created_and_persists_hold()
    {
        var admissionClass = await CreateClassAsync();
        var studentId = "20152691234567890";

        var result = await controller.CreateHold(
            admissionClass.Id, studentId);

        var created = Assert.IsType<CreatedResult>(result);

        Assert.Equal(201, created.StatusCode);

        var hold = await db.Holds.SingleAsync();

        Assert.Equal($"/holds/{hold.Id}", created.Location);
        Assert.Equal(admissionClass.Id, hold.ClassId);
        Assert.Equal(studentId, hold.StudentId);
        Assert.Equal("HELD", hold.Status);

        Assert.InRange(
            (hold.ExpiresAt - hold.CreatedAt).TotalSeconds,
            599,
            601);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("1234567890123456")]
    [InlineData("123456789012345678")]
    [InlineData("12345678901234abc")]
    [InlineData("12345678901234 67")]
    public async Task CreateHold_invalid_student_id_returns_400(
        string? studentId)
    {
        var admissionClass = await CreateClassAsync();

        var result = await controller.CreateHold(
            admissionClass.Id, studentId);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(await db.Holds.ToListAsync());
    }

    [Fact]
    public async Task CreateHold_nonexistent_class_returns_404()
    {
        var result = await controller.CreateHold(
            "missing-class", "20152691234567890");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task CreateHold_duplicate_student_returns_409()
    {
        var admissionClass = await CreateClassAsync();
        var studentId = "20152691234567890";

        var firstResult = await controller.CreateHold(
            admissionClass.Id, studentId);

        Assert.IsType<CreatedResult>(firstResult);

        var secondResult = await controller.CreateHold(
            admissionClass.Id, studentId);

        Assert.IsType<ConflictObjectResult>(secondResult);

        Assert.Equal(1, await db.Holds.CountAsync());
    }

    [Fact]
    public async Task CreateHold_full_class_returns_409()
    {
        var admissionClass = await CreateClassAsync(totalSeats: 1);

        var firstResult = await controller.CreateHold(
            admissionClass.Id, "20152691234567890");

        Assert.IsType<CreatedResult>(firstResult);

        var secondResult = await controller.CreateHold(
            admissionClass.Id, "20152691234567891");

        Assert.IsType<ConflictObjectResult>(secondResult);

        Assert.Equal(1, await db.Holds.CountAsync());
    }

    [Fact]
    public async Task CreateHold_expired_hold_allows_reapplication()
    {
        var admissionClass = await CreateClassAsync();
        var studentId = "20152691234567890";

        db.Holds.Add(new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = studentId,
            Status = "HELD",
            CreatedAt = DateTime.UtcNow.AddMinutes(-20),
            ExpiresAt = DateTime.UtcNow.AddMinutes(-10)
        });

        await db.SaveChangesAsync();

        var result = await controller.CreateHold(
            admissionClass.Id, studentId);

        Assert.IsType<CreatedResult>(result);

        var holds = await db.Holds
            .AsNoTracking()
            .OrderBy(h => h.CreatedAt)
            .ToListAsync();

        Assert.Equal(2, holds.Count);
        Assert.Equal("EXPIRED", holds[0].Status);
        Assert.Equal("HELD", holds[1].Status);
    }

    [Fact]
    public async Task CreateHold_uses_configured_duration()
    {
        var admissionClass = await CreateClassAsync();

        var configuredController = CreateController(duration: 120);

        var result = await configuredController.CreateHold(
            admissionClass.Id, "20152691234567890");

        Assert.IsType<CreatedResult>(result);

        var hold = await db.Holds.SingleAsync();

        Assert.InRange(
            (hold.ExpiresAt - hold.CreatedAt).TotalSeconds,
            119,
            121);
    }
}
