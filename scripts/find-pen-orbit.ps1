$pathsToSearch = @(
    ".",
    "..\..",
    "C:\Users\Baquan\OneDrive\Máy tính",
    "C:\Users\Baquan\Desktop",
    "C:\Users\Baquan\Downloads"
)

foreach ($p in $pathsToSearch) {
    if (Test-Path $p) {
        Write-Host "Searching in $p..."
        Get-ChildItem -Path $p -Recurse -Depth 3 -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -like "*B*ng ki*m*" -or
            $_.Name -like "*bút và quỹ đạo*" -or
            $_.Name -like "*but va quy dao*" -or
            $_.Name -like "*bút*" -or
            $_.Name -like "*quỹ đạo*"
        } | Select-Object FullName, Length
    }
}
