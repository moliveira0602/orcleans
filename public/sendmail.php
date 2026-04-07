<?php
/**
 * ORCA - Contact Form Email Handler
 * Sends form submissions to moliveira@etos.pt
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

$to = 'moliveira@etos.pt';
$subject = 'ORCA - Contato via Site';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['name']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
    exit;
}

$name    = filter_var(trim($data['name']), FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$email   = filter_var(trim($data['email']), FILTER_VALIDATE_EMAIL);
$phone   = filter_var(trim($data['phone'] ?? ''), FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$company = filter_var(trim($data['company'] ?? ''), FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$message = filter_var(trim($data['message'] ?? ''), FILTER_SANITIZE_FULL_SPECIAL_CHARS);

if (!$name || !$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nome e email são obrigatórios']);
    exit;
}

$headers = "From: ORCA Contato <noreply@etos.pt>\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";

$body = "
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='font-family: Arial, sans-serif; background: #05070A; color: #EAF6FF; padding: 20px;'>
<div style='max-width: 500px; margin: 0 auto; background: #0B1F2E; border-radius: 12px; padding: 32px; border: 1px solid rgba(0,194,255,0.15);'>
    <div style='text-align: center; margin-bottom: 24px;'>
        <strong style='color: #00C2FF; font-size: 18px;'>ORCA</strong>
        <p style='color: rgba(234,246,255,0.5); font-size: 13px; margin: 8px 0 0;'>Nova mensagem via site</p>
    </div>
    <table style='width: 100%; border-collapse: collapse;'>
        <tr><td style='color: rgba(234,246,255,0.4); padding: 8px 0; font-size: 13px;'>Nome:</td><td style='color: #EAF6FF; padding: 8px 0; font-size: 14px; font-weight: 600;'>{$name}</td></tr>
        <tr><td style='color: rgba(234,246,255,0.4); padding: 8px 0; font-size: 13px;'>Email:</td><td style='color: #EAF6FF; padding: 8px 0; font-size: 14px;'>{$email}</td></tr>
        {$phone ? "<tr><td style='color: rgba(234,246,255,0.4); padding: 8px 0; font-size: 13px;'>Telefone:</td><td style='color: #EAF6FF; padding: 8px 0; font-size: 14px;'>{$phone}</td></tr>" : ''}
        {$company ? "<tr><td style='color: rgba(234,246,255,0.4); padding: 8px 0; font-size: 13px;'>Empresa:</td><td style='color: #EAF6FF; padding: 8px 0; font-size: 14px;'>{$company}</td></tr>" : ''}
    </table>
    {$message ? "<div style='margin-top: 20px; padding: 16px; background: rgba(5,7,10,0.5); border-radius: 8px;'>
        <p style='color: rgba(234,246,255,0.4); font-size: 12px; margin: 0 0 8px;'>Mensagem:</p>
        <p style='color: #EAF6FF; font-size: 14px; margin: 0;'>{$message}</p>
    </div>" : ''}
</div>
</body>
</html>
";

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Email enviado com sucesso']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao enviar email']);
}
