<?php
/**
 * Klockn Waitlist Form Handler
 * Receives: { name, email, phone }
 * Does:
 *   1. Validates input
 *   2. Appends to waitlist.csv on the server (backup)
 *   3. Sends notification email to admin (likithawa2020@gmail.com)
 *   4. Sends confirmation email to the person who signed up
 *   5. Returns JSON { success: true }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// ── Config ────────────────────────────────────
define('ADMIN_EMAIL', 'likithawa2020@gmail.com');
define('FROM_EMAIL',  'hello@klockn.com');
define('FROM_NAME',   'Klockn');
define('CSV_FILE',    __DIR__ . '/waitlist.csv');
// ─────────────────────────────────────────────

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Parse JSON body
$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    // Fallback: try form-encoded
    $body = $_POST;
}

// Sanitize
$name  = trim(strip_tags($body['name']  ?? ''));
$email = trim(strip_tags($body['email'] ?? ''));
$phone = trim(strip_tags($body['phone'] ?? ''));

// Validate
if (empty($name) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Name and valid email are required']);
    exit;
}

$timestamp = date('Y-m-d H:i:s');

// ── 1. Append to CSV ──────────────────────────
$csvExists = file_exists(CSV_FILE);
$fh = fopen(CSV_FILE, 'a');
if ($fh) {
    // Write header row on first entry
    if (!$csvExists) {
        fputcsv($fh, ['Timestamp', 'Name', 'Email', 'Phone']);
    }
    fputcsv($fh, [$timestamp, $name, $email, $phone]);
    fclose($fh);
}

// ── 2. Email to admin ─────────────────────────
$adminSubject = "🎉 New Klockn Waitlist Signup — $name";
$adminBody = "
New waitlist signup on Klockn!

Name:      $name
Email:     $email
Phone:     $phone
Time:      $timestamp

--
View all signups: https://klockn.com/admin.php
";

$adminHeaders  = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
$adminHeaders .= "Reply-To: $email\r\n";
$adminHeaders .= "X-Mailer: PHP/" . phpversion();

mail(ADMIN_EMAIL, $adminSubject, $adminBody, $adminHeaders);

// ── 3. Confirmation email to user ─────────────
$userSubject = "You're on the Klockn waitlist ✅";
$userBody = "
Hi $name,

You're on the list! 🎉

We're rolling out Klockn group by group and we'll reach out as soon as your spot is ready.

In the meantime — Klockn is building the app that finally answers
\"when is everyone free?\" for every group in your life.

We'll be in touch soon.

— The Klockn team
hello@klockn.com | klockn.com

---
You're receiving this because you signed up at klockn.com.
";

$userHeaders  = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
$userHeaders .= "Reply-To: " . FROM_EMAIL . "\r\n";
$userHeaders .= "X-Mailer: PHP/" . phpversion();

mail($email, $userSubject, $userBody, $userHeaders);

// ── 4. Return success ─────────────────────────
echo json_encode(['success' => true, 'message' => 'You\'re on the list!']);
exit;
