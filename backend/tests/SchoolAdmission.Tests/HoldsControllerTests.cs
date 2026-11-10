
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SchoolAdmission.Api.Controllers;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Models;

namespace SchoolAdmission.Tests;

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
            Name = "Class 6 - Morning Shift",
            TotalSeats = totalSeats
        };

        db.Classes.Add(admissionClass);
        await db.SaveChangesAsync();

        return admissionClass;
    }

    private static T GetProperty<T>(object? value, string propertyName)
    {
        Assert.NotNull(value);

        var property = value.GetType().GetProperty(propertyName);

        Assert.NotNull(property);

        return Assert.IsType<T>(property.GetValue(value));
    }

    [Fact]
    public async Task CreateHold_returns_created_and_persists_hold()
    {
        var admissionClass = await CreateClassAsync();
        var studentId = "20152691234567890";

        var result = await controller.CreateHold(
            admissionClass.Id, studentId);

        var created = Assert.IsType<CreatedResult>(result);

        var hold = await db.Holds.SingleAsync();

        Assert.Equal(201, created.StatusCode);
        Assert.Equal($" /holds/{hold.Id}".Trim(), created.Location);
        Assert.Equal(admissionClass.Id, hold.ClassId);
        Assert.Equal(studentId, hold.StudentId);
        Assert.Equal("HELD", hold.Status);

        Assert.InRange(
            (hold.ExpiresAt - hold.CreatedAt).TotalSeconds,
            599,
            601);

        Assert.Equal(
            hold.Id,
            GetProperty<string>(created.Value, "holdId"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("1234567890123456")]
    [InlineData("123456789012345678")]
    [InlineData("12345678901234abc")]
    [InlineData("12345678901234 67")]
    public async Task CreateHold_invalid_student_id_returns_bad_request(
        string? studentId)
    {
        var admissionClass = await CreateClassAsync();

        var result = await controller.CreateHold(
            admissionClass.Id, studentId);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(await db.Holds.ToListAsync());
    }

    [Fact]
    public async Task CreateHold_returns_not_found_when_class_does_not_exist()
    {
        var result = await controller.CreateHold(
            "missing-class", "20152691234567890");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task CreateHold_returns_conflict_for_duplicate_application()
    {
        var admissionClass = await CreateClassAsync();
        var studentId = "20152691234567890";

        var firstResult = await controller.CreateHold(
            admissionClass.Id, studentId);

        var secondResult = await controller.CreateHold(
            admissionClass.Id, studentId);

        Assert.IsType<CreatedResult>(firstResult);
        Assert.IsType<ConflictObjectResult>(secondResult);
        Assert.Equal(1, await db.Holds.CountAsync());
    }

    [Fact]
    public async Task CreateHold_returns_conflict_when_class_is_full()
    {
        var admissionClass = await CreateClassAsync(totalSeats: 1);

        var firstResult = await controller.CreateHold(
            admissionClass.Id, "20152691234567890");

        var secondResult = await controller.CreateHold(
            admissionClass.Id, "20152691234567891");

        Assert.IsType<CreatedResult>(firstResult);
        Assert.IsType<ConflictObjectResult>(secondResult);
        Assert.Equal(1, await db.Holds.CountAsync());
    }

    [Fact]
    public async Task CreateHold_expires_old_hold_and_allows_reapplication()
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
        var configuredController = CreateController(120);

        var result = await configuredController.CreateHold(
            admissionClass.Id, "20152691234567890");

        Assert.IsType<CreatedResult>(result);

        var hold = await db.Holds.SingleAsync();

        Assert.InRange(
            (hold.ExpiresAt - hold.CreatedAt).TotalSeconds,
            119,
            121);
    }

    [Fact]
    public async Task GetHold_returns_details_when_hold_exists()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.GetHold(hold.Id);

        var ok = Assert.IsType<OkObjectResult>(result);

        Assert.Equal(hold.Id, GetProperty<string>(ok.Value, "holdId"));
        Assert.Equal(admissionClass.Id, GetProperty<string>(ok.Value, "classId"));
        Assert.Equal("HELD", GetProperty<string>(ok.Value, "status"));
        var returnedExpiresAt = GetProperty<DateTime>(ok.Value, "expiresAt");
        Assert.InRange(
            (returnedExpiresAt - hold.ExpiresAt).Duration(),
            TimeSpan.Zero,
            TimeSpan.FromMicroseconds(1));
    }

    [Fact]
    public async Task GetHold_returns_not_found_when_hold_does_not_exist()
    {
        var result = await controller.GetHold("missing-hold");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ConfirmHold_returns_ok_and_updates_status()
    {
        var admissionClass = await CreateClassAsync();
        var studentId = "20152691234567890";

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = studentId,
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.ConfirmHold(hold.Id, studentId);

        var ok = Assert.IsType<OkObjectResult>(result);

        Assert.Equal(hold.Id, GetProperty<string>(ok.Value, "holdId"));
        Assert.Equal("CONFIRMED", GetProperty<string>(ok.Value, "status"));
        Assert.Equal("CONFIRMED", hold.Status);
    }

    [Fact]
    public async Task ConfirmHold_returns_forbidden_for_another_student()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.ConfirmHold(
            hold.Id, "20152691234567891");

        Assert.IsType<ForbidResult>(result);
        Assert.Equal("HELD", hold.Status);
    }

    [Fact]
    public async Task ConfirmHold_returns_bad_request_for_invalid_student_id()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.ConfirmHold(hold.Id, "12345");

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ConfirmHold_returns_not_found_for_missing_hold()
    {
        var result = await controller.ConfirmHold(
            "missing-hold", "20152691234567890");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ConfirmHold_returns_conflict_when_hold_has_expired()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            CreatedAt = DateTime.UtcNow.AddMinutes(-20),
            ExpiresAt = DateTime.UtcNow.AddMinutes(-10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.ConfirmHold(
            hold.Id, hold.StudentId);

        Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal("EXPIRED", hold.Status);
    }

    [Fact]
    public async Task ConfirmHold_repeated_confirmation_is_idempotent()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var firstResult = await controller.ConfirmHold(
            hold.Id, hold.StudentId);

        var secondResult = await controller.ConfirmHold(
            hold.Id, hold.StudentId);

        Assert.IsType<OkObjectResult>(firstResult);
        Assert.IsType<OkObjectResult>(secondResult);

        Assert.Equal(
            1,
            await db.Holds.CountAsync(h =>
                h.ClassId == admissionClass.Id &&
                h.Status == "CONFIRMED"));
    }

    [Fact]
    public async Task CancelHold_returns_no_content_and_updates_status()
    {
        var admissionClass = await CreateClassAsync();
        var studentId = "20152691234567890";

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = studentId,
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.CancelHold(hold.Id, studentId);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("CANCELLED", hold.Status);
    }

    [Fact]
    public async Task CancelHold_returns_forbidden_for_another_student()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.CancelHold(
            hold.Id, "20152691234567891");

        Assert.IsType<ForbidResult>(result);
        Assert.Equal("HELD", hold.Status);
    }

    [Fact]
    public async Task CancelHold_returns_not_found_for_missing_hold()
    {
        var result = await controller.CancelHold(
            "missing-hold", "20152691234567890");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task CancelHold_returns_bad_request_for_invalid_student_id()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.CancelHold(hold.Id, "12345");

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CancelHold_allows_cancelling_confirmed_hold()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "CONFIRMED",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.CancelHold(
            hold.Id, hold.StudentId);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("CANCELLED", hold.Status);
    }

    [Fact]
    public async Task CancelHold_expired_hold_returns_no_content()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            CreatedAt = DateTime.UtcNow.AddMinutes(-20),
            ExpiresAt = DateTime.UtcNow.AddMinutes(-10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var result = await controller.CancelHold(
            hold.Id, hold.StudentId);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("EXPIRED", hold.Status);
    }

    [Fact]
    public async Task CancelHold_repeated_cancellation_is_idempotent()
    {
        var admissionClass = await CreateClassAsync();

        var hold = new AdmissionHold
        {
            ClassId = admissionClass.Id,
            StudentId = "20152691234567890",
            Status = "HELD",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        db.Holds.Add(hold);
        await db.SaveChangesAsync();

        var firstResult = await controller.CancelHold(
            hold.Id, hold.StudentId);

        var secondResult = await controller.CancelHold(
            hold.Id, hold.StudentId);

        Assert.IsType<NoContentResult>(firstResult);
        Assert.IsType<NoContentResult>(secondResult);
        Assert.Equal("CANCELLED", hold.Status);
    }

    [Fact]
    public async Task CreateHold_concurrent_requests_do_not_overbook_class()
    {
        const int totalSeats = 5;
        const int requestCount = 20;

        var admissionClass = await CreateClassAsync(totalSeats);

        var studentIds = Enumerable.Range(0, requestCount)
            .Select(i => $"20152691234567{i:D3}")
            .ToArray();

        var tasks = studentIds.Select(async studentId =>
        {
            await using var requestDb =
                await fixture.CreateDbContextWithoutResettingAsync();

            var requestConfiguration = new ConfigurationManager();

            var requestController = new HoldsController(
                requestDb, requestConfiguration);

            return await requestController.CreateHold(
                admissionClass.Id, studentId);
        });

        var results = await Task.WhenAll(tasks);

        Assert.Equal(
            totalSeats,
            results.Count(r => r is CreatedResult));

        Assert.Equal(
            requestCount - totalSeats,
            results.Count(r => r is ConflictObjectResult));

        var activeHolds = await db.Holds.CountAsync(h =>
            h.ClassId == admissionClass.Id &&
            h.Status == "HELD" &&
            h.ExpiresAt > DateTime.UtcNow);

        Assert.Equal(totalSeats, activeHolds);
    }
}
