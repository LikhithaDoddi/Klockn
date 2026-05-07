<?php
/**
 * Klockn Admin — Waitlist Dashboard
 * Password protected. Change ADMIN_PASSWORD before uploading.
 * Access at: klockn.com/admin
 */

// ── Change this password ──
define('ADMIN_PASSWORD', 'klockn2026');
define('CSV_FILE', __DIR__ . '/waitlist.csv');
// ─────────────────────────

session_start();

// Handle login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    if ($_POST['password'] === ADMIN_PASSWORD) {
        $_SESSION['klockn_admin'] = true;
    } else {
        $error = 'Wrong password.';
    }
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

// Handle CSV download
if (isset($_GET['download']) && $_SESSION['klockn_admin']) {
    if (file_exists(CSV_FILE)) {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="klockn-waitlist-' . date('Y-m-d') . '.csv"');
        readfile(CSV_FILE);
        exit;
    }
}

// Load signups
$signups = [];
if ($_SESSION['klockn_admin'] && file_exists(CSV_FILE)) {
    $fh = fopen(CSV_FILE, 'r');
    $header = fgetcsv($fh); // skip header row
    while (($row = fgetcsv($fh)) !== false) {
        $signups[] = $row;
    }
    fclose($fh);
    $signups = array_reverse($signups); // newest first
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Klockn Admin</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',sans-serif;background:#09090B;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}

    /* Login */
    .login-box{width:100%;max-width:380px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:48px 40px;text-align:center}
    .login-logo{font-size:24px;font-weight:800;margin-bottom:8px}
    .login-sub{font-size:14px;color:#666;margin-bottom:36px}
    .login-input{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 18px;color:#fff;font-family:'Inter',sans-serif;font-size:15px;outline:none;margin-bottom:12px}
    .login-input:focus{border-color:rgba(124,58,237,0.5);box-shadow:0 0 0 3px rgba(124,58,237,0.1)}
    .login-btn{width:100%;padding:14px;background:#7C3AED;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s}
    .login-btn:hover{background:#6D28D9}
    .login-error{color:#F87171;font-size:13px;margin-bottom:12px}

    /* Dashboard */
    .dash{width:100%;max-width:1000px;align-self:flex-start;margin:0 auto}
    .dash-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:12px}
    .dash-title{font-size:28px;font-weight:800;letter-spacing:-1px}
    .dash-actions{display:flex;gap:10px}
    .dash-btn{padding:9px 20px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;border:none;font-family:'Inter',sans-serif;transition:all 0.2s}
    .btn-dl{background:#7C3AED;color:#fff}
    .btn-dl:hover{background:#6D28D9}
    .btn-out{background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1)}
    .btn-out:hover{background:rgba(255,255,255,0.1)}

    .stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
    .stat{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:24px}
    .stat-n{font-size:36px;font-weight:900;letter-spacing:-1px;color:#fff}
    .stat-l{font-size:13px;color:#666;margin-top:4px}

    .table-wrap{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden}
    table{width:100%;border-collapse:collapse}
    th{padding:14px 20px;text-align:left;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#555;border-bottom:1px solid rgba(255,255,255,0.05)}
    td{padding:14px 20px;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:rgba(255,255,255,0.02)}
    .td-name{font-weight:600}
    .td-email{color:#A78BFA}
    .td-phone{color:#888}
    .td-time{color:#555;font-size:12px}
    .empty{text-align:center;padding:60px 20px;color:#555;font-size:15px}
  </style>
</head>
<body>

<?php if (!$_SESSION['klockn_admin']): ?>
  <!-- LOGIN -->
  <div class="login-box">
    <div class="login-logo">🔐 klockn</div>
    <div class="login-sub">Admin access only</div>
    <?php if (!empty($error)): ?>
      <div class="login-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <form method="POST">
      <input class="login-input" type="password" name="password" placeholder="Password" autofocus/>
      <button class="login-btn" type="submit">Sign in →</button>
    </form>
  </div>

<?php else: ?>
  <!-- DASHBOARD -->
  <div class="dash">
    <div class="dash-header">
      <div>
        <div class="dash-title">Waitlist</div>
        <div style="font-size:14px;color:#555;margin-top:4px">klockn.com signups</div>
      </div>
      <div class="dash-actions">
        <a href="admin.php?download=1" class="dash-btn btn-dl">↓ Export CSV</a>
        <a href="admin.php?logout=1"   class="dash-btn btn-out">Sign out</a>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat">
        <div class="stat-n"><?= count($signups) ?></div>
        <div class="stat-l">Total signups</div>
      </div>
      <div class="stat">
        <div class="stat-n"><?= count(array_filter($signups, fn($r) => !empty($r[3]))) ?></div>
        <div class="stat-l">With phone number</div>
      </div>
      <div class="stat">
        <div class="stat-n"><?= !empty($signups) ? date('d M', strtotime($signups[0][0])) : '—' ?></div>
        <div class="stat-l">Latest signup</div>
      </div>
    </div>

    <div class="table-wrap">
      <?php if (empty($signups)): ?>
        <div class="empty">No signups yet. Share the link! 🚀</div>
      <?php else: ?>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Signed up</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($signups as $row): ?>
            <tr>
              <td class="td-name"><?= htmlspecialchars($row[1] ?? '') ?></td>
              <td class="td-email"><?= htmlspecialchars($row[2] ?? '') ?></td>
              <td class="td-phone"><?= htmlspecialchars($row[3] ?? '—') ?></td>
              <td class="td-time"><?= htmlspecialchars($row[0] ?? '') ?></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      <?php endif; ?>
    </div>
  </div>
<?php endif; ?>

</body>
</html>
