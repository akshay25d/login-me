$port = 8080
$root = "c:\Users\aksha\Downloads\DV RESOLVE\new work"
$prefix = "http://localhost:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Server running at $prefix" -ForegroundColor Green

while ($listener.IsListening) {
    try {
        $context  = $listener.GetContext()
        $request  = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path) -or $path -eq '/') { $path = 'index.html' }

        $fullPath = Join-Path $root $path

        if (Test-Path $fullPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            switch -Wildcard ($path) {
                '*.html' { $response.ContentType = 'text/html; charset=utf-8' }
                '*.js'   { $response.ContentType = 'application/javascript; charset=utf-8' }
                '*.css'  { $response.ContentType = 'text/css; charset=utf-8' }
                '*.json' { $response.ContentType = 'application/json; charset=utf-8' }
                '*.png'  { $response.ContentType = 'image/png' }
                '*.jpg'  { $response.ContentType = 'image/jpeg' }
                '*.jpeg' { $response.ContentType = 'image/jpeg' }
                '*.svg'  { $response.ContentType = 'image/svg+xml' }
                '*.ico'  { $response.ContentType = 'image/x-icon' }
                default  { $response.ContentType = 'application/octet-stream' }
            }
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    } catch { }
}
