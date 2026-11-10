using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using Testcontainers.PostgreSql;

namespace SchoolAdmission.Tests;

public sealed class PostgreSqlFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("school_admission_test")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    public async Task InitializeAsync()
    {
        await container.StartAsync();
    }

    public async Task DisposeAsync()
    {
        await container.DisposeAsync();
    }

    public async Task<AppDbContext> CreateDbContextAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(container.GetConnectionString())
            .Options;

        var db = new AppDbContext(options);
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
        return db;
    }

    public Task<AppDbContext> CreateDbContextWithoutResettingAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(container.GetConnectionString())
            .Options;

        return Task.FromResult(new AppDbContext(options));
    }
}
