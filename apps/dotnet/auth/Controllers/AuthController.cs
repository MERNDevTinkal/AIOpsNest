using Microsoft.AspNetCore.Mvc;
using AuthService.DTOs;
using AuthService.Services;

namespace AuthService.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase {
    private readonly AuthService _auth;
    public AuthController(AuthService auth) { _auth = auth; }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto) {
        var user = await _auth.RegisterAsync(dto.Email, dto.Password);
        return Ok(new { id = user.Id, email = user.Email });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto) {
        try {
            var token = await _auth.LoginAsync(dto.Email, dto.Password);
            return Ok(new { accessToken = token });
        } catch (Exception ex) {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpGet("health")]
    public IActionResult Health() => Ok("ok");
}
