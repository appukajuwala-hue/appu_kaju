# Removes the studio-white background from the Appu Kaju pack shots.
#
# Two stages, because a plain threshold flood fill is not enough here:
#
#  1. Flood fill seeded from the image border, so white pixels fully enclosed
#     by packaging (the cashews behind each pack's window) are never reached.
#
#  2. A morphological OPENING of the background mask. The packs' crimped tops
#     are white material printed with thin pattern lines, so the fill leaks
#     between those lines and shreds the seal into lace. Those leaks are thin
#     regions of the mask; eroding then dilating deletes anything narrower than
#     the kernel while leaving the real background untouched.
#
# Run against the *-original.png backups; safe to re-run.

Add-Type -AssemblyName System.Drawing

$code = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public static class Cutout
{
    // Separable square erosion. Out-of-bounds counts as background, so the
    // frame edge never erodes away.
    static bool[] Erode(bool[] m, int w, int h, int r)
    {
        bool[] tmp = new bool[w * h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                bool all = true;
                for (int k = -r; k <= r && all; k++)
                {
                    int nx = x + k;
                    if (nx < 0 || nx >= w) continue;
                    if (!m[y * w + nx]) all = false;
                }
                tmp[y * w + x] = all;
            }
        bool[] outm = new bool[w * h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                bool all = true;
                for (int k = -r; k <= r && all; k++)
                {
                    int ny = y + k;
                    if (ny < 0 || ny >= h) continue;
                    if (!tmp[ny * w + x]) all = false;
                }
                outm[y * w + x] = all;
            }
        return outm;
    }

    static bool[] Dilate(bool[] m, int w, int h, int r)
    {
        bool[] tmp = new bool[w * h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                bool any = false;
                for (int k = -r; k <= r && !any; k++)
                {
                    int nx = x + k;
                    if (nx < 0 || nx >= w) continue;
                    if (m[y * w + nx]) any = true;
                }
                tmp[y * w + x] = any;
            }
        bool[] outm = new bool[w * h];
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                bool any = false;
                for (int k = -r; k <= r && !any; k++)
                {
                    int ny = y + k;
                    if (ny < 0 || ny >= h) continue;
                    if (tmp[ny * w + x]) any = true;
                }
                outm[y * w + x] = any;
            }
        return outm;
    }

    public static string Run(string src, string dst, int hardLum, int softLum, int maxSpread, int openRadius)
    {
        using (Bitmap orig = new Bitmap(src))
        {
            int w = orig.Width, h = orig.Height;
            Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(bmp)) { g.DrawImage(orig, 0, 0, w, h); }

            BitmapData bd = bmp.LockBits(new Rectangle(0, 0, w, h),
                ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int bytes = Math.Abs(bd.Stride) * h;
            byte[] px = new byte[bytes];
            System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, px, 0, bytes);

            bool[] bg = new bool[w * h];
            bool[] seen = new bool[w * h];
            Queue<int> q = new Queue<int>();

            for (int x = 0; x < w; x++) { Seed(px, bd.Stride, x, 0, w, seen, q, hardLum, maxSpread);
                                          Seed(px, bd.Stride, x, h - 1, w, seen, q, hardLum, maxSpread); }
            for (int y = 0; y < h; y++) { Seed(px, bd.Stride, 0, y, w, seen, q, hardLum, maxSpread);
                                          Seed(px, bd.Stride, w - 1, y, w, seen, q, hardLum, maxSpread); }

            int[] dx = { 1, -1, 0, 0 };
            int[] dy = { 0, 0, 1, -1 };

            while (q.Count > 0)
            {
                int idx = q.Dequeue();
                bg[idx] = true;
                int cx = idx % w, cy = idx / w;
                for (int k = 0; k < 4; k++)
                {
                    int nx = cx + dx[k], ny = cy + dy[k];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    int nidx = ny * w + nx;
                    if (seen[nidx]) continue;
                    int off = ny * bd.Stride + nx * 4;
                    if (IsBg(px[off + 2], px[off + 1], px[off], hardLum, maxSpread))
                    { seen[nidx] = true; q.Enqueue(nidx); }
                }
            }

            int rawCleared = 0;
            for (int i = 0; i < bg.Length; i++) if (bg[i]) rawCleared++;

            // Opening: delete leaks thinner than the kernel, keep the real background.
            if (openRadius > 0)
            {
                bool[] eroded = Erode(bg, w, h, openRadius);
                bg = Dilate(eroded, w, h, openRadius);

                // The opening severs wider leaks from the outside but leaves
                // them as islands punched into the product. Anything not
                // reachable from the frame edge is not background — restore it.
                bool[] reach = new bool[w * h];
                Queue<int> rq = new Queue<int>();
                for (int x = 0; x < w; x++)
                {
                    if (bg[x] && !reach[x]) { reach[x] = true; rq.Enqueue(x); }
                    int b = (h - 1) * w + x;
                    if (bg[b] && !reach[b]) { reach[b] = true; rq.Enqueue(b); }
                }
                for (int y = 0; y < h; y++)
                {
                    int l = y * w, r2 = y * w + w - 1;
                    if (bg[l] && !reach[l]) { reach[l] = true; rq.Enqueue(l); }
                    if (bg[r2] && !reach[r2]) { reach[r2] = true; rq.Enqueue(r2); }
                }
                while (rq.Count > 0)
                {
                    int idx = rq.Dequeue();
                    int cx = idx % w, cy = idx / w;
                    for (int k = 0; k < 4; k++)
                    {
                        int nx = cx + dx[k], ny = cy + dy[k];
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                        int nidx = ny * w + nx;
                        if (bg[nidx] && !reach[nidx]) { reach[nidx] = true; rq.Enqueue(nidx); }
                    }
                }
                for (int i = 0; i < bg.Length; i++) if (bg[i] && !reach[i]) bg[i] = false;
            }

            int cleared = 0;
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                    if (bg[y * w + x]) { px[y * bd.Stride + x * 4 + 3] = 0; cleared++; }

            // Feather the boundary so the anti-aliased edge softens rather than
            // leaving a hard white fringe.
            int feathered = 0;
            for (int y = 1; y < h - 1; y++)
            {
                for (int x = 1; x < w - 1; x++)
                {
                    int idx = y * w + x;
                    if (bg[idx]) continue;
                    bool touches = bg[idx - 1] || bg[idx + 1] || bg[idx - w] || bg[idx + w];
                    if (!touches) continue;
                    int off = y * bd.Stride + x * 4;
                    int lum = Lum(px[off + 2], px[off + 1], px[off]);
                    if (lum <= softLum) continue;
                    double a = (double)(hardLum - lum) / (hardLum - softLum);
                    if (a < 0) a = 0; if (a > 1) a = 1;
                    px[off + 3] = (byte)(a * 255);
                    feathered++;
                }
            }

            System.Runtime.InteropServices.Marshal.Copy(px, 0, bd.Scan0, bytes);
            bmp.UnlockBits(bd);
            bmp.Save(dst, ImageFormat.Png);
            bmp.Dispose();

            return string.Format("{0}x{1} cleared={2} ({3:F1}%) repaired={4} feathered={5}",
                w, h, cleared, 100.0 * cleared / (w * h), rawCleared - cleared, feathered);
        }
    }

    static void Seed(byte[] px, int stride, int x, int y, int w, bool[] seen, Queue<int> q, int hardLum, int maxSpread)
    {
        int idx = y * w + x;
        if (seen[idx]) return;
        int off = y * stride + x * 4;
        if (IsBg(px[off + 2], px[off + 1], px[off], hardLum, maxSpread)) { seen[idx] = true; q.Enqueue(idx); }
    }

    static int Lum(byte r, byte g, byte b) { return (r * 299 + g * 587 + b * 114) / 1000; }

    static bool IsBg(byte r, byte g, byte b, int hardLum, int maxSpread)
    {
        int max = Math.Max(r, Math.Max(g, b));
        int min = Math.Min(r, Math.Min(g, b));
        return Lum(r, g, b) >= hardLum && (max - min) <= maxSpread;
    }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$dir = "C:\Users\Asus\Downloads\Venky\new\appu_kaju_2.0\public\images"
$packs = @("appu-kaju", "kuber-kaju", "rimmee-kaju", "rimmee-kaju-10kg")

foreach ($p in $packs) {
    $target = Join-Path $dir "$p.png"
    $backup = Join-Path $dir "$p-original.png"
    if (-not (Test-Path $backup)) { Copy-Item $target $backup }

    $tmp = Join-Path $env:TEMP "$p-cut.png"
    # 250/6 keys only near-pure white (measurement: 98% of the true backdrop is
    # >= 250, while the pack's seal sits at 233-249). openRadius 6 then repairs
    # the leaks that still creep between the seal's printed pattern lines.
    $info = [Cutout]::Run($backup, $tmp, 250, 225, 6, 6)
    Move-Item -Force $tmp $target
    Write-Output ("{0,-22} {1}" -f $p, $info)
}
