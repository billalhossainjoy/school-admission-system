using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.Requests;
public sealed record CreateClassRequestDto
{
    [Required]
    public required string Name { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "TotalSeats must be greater than zero.")]
    public int TotalSeats { get; init; }
}
