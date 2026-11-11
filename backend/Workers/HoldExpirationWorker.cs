using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;

namespace SchoolAdmission.Api.Workers;

public sealed class HoldExpirationWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<HoldExpirationWorker> logger,
    IConfiguration configuration
) : BackgroundService
{
    private readonly TimeSpan checkInterval = TimeSpan.FromSeconds(
        Math.Max(
            1,
            configuration.GetValue<int?>(
                "HOLD_EXPIRATION_CHECK_INTERVAL_SECONDS"
            ) ?? 5
        )
    );

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken
    )
    {
        await ExpireHoldsAsync(stoppingToken);

        using var timer = new PeriodicTimer(checkInterval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await ExpireHoldsAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException)
            when (stoppingToken.IsCancellationRequested)
        {
            // Application is shutting down.
        }
    }

    private async Task ExpireHoldsAsync(
        CancellationToken cancellationToken
    )
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();

            var db = scope.ServiceProvider
                .GetRequiredService<AppDbContext>();

            var now = DateTime.UtcNow;

            var expiredCount = await db.Holds
                .Where(h =>
                    h.Status == "HELD" &&
                    h.ExpiresAt <= now
                )
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(
                        h => h.Status,
                        "EXPIRED"
                    ),
                    cancellationToken
                );

            if (expiredCount > 0)
            {
                logger.LogInformation(
                    "Expired {Count} admission holds.",
                    expiredCount
                );
            }
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Failed to expire admission holds."
            );
        }
    }
}
