$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "Server running at $prefix"
Start-Process $prefix

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path) -or $path -eq '/') {
            $path = 'index.html'
        }
        
        $fullPath = Join-Path $PSScriptRoot $path
        if (Test-Path $fullPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            if ($path.EndsWith('.html')) { $response.ContentType = 'text/html; charset=utf-8' }
            elseif ($path.EndsWith('.js')) { $response.ContentType = 'application/javascript; charset=utf-8' }
            elseif ($path.EndsWith('.css')) { $response.ContentType = 'text/css; charset=utf-8' }
            elseif ($path.EndsWith('.json')) { $response.ContentType = 'application/json; charset=utf-8' }
            elseif ($path.EndsWith('.svg')) { $response.ContentType = 'image/svg+xml' }
            elseif ($path.EndsWith('.webp')) { $response.ContentType = 'image/webp' }
            elseif ($path.EndsWith('.ico')) { $response.ContentType = 'image/x-icon' }
            elseif ($path.EndsWith('.jpeg') -or $path.EndsWith('.jpg')) { $response.ContentType = 'image/jpeg' }
            elseif ($path.EndsWith('.png')) { $response.ContentType = 'image/png' }
            else { $response.ContentType = 'application/octet-stream' }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # ignore client disconnect
    }
}
