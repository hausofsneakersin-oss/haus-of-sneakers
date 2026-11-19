const https = require('https');

module.exports = async (req, res) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).send('Invalid file id');
  }

  const driveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  };
  if (req.headers.range) {
    headers['Range'] = req.headers.range;
  }

  https.get(driveUrl, { headers }, (driveRes) => {
    // Follow redirect if Google Drive returns 303/302
    if (driveRes.statusCode === 303 || driveRes.statusCode === 302) {
      const redirectUrl = driveRes.headers.location;
      if (redirectUrl) {
        https.get(redirectUrl, { headers }, (subRes) => {
          pipeVideo(subRes, res);
        }).on('error', (err) => {
          res.status(502).send(err.message);
        });
        return;
      }
    }
    pipeVideo(driveRes, res);
  }).on('error', (err) => {
    res.status(502).send(err.message);
  });
};

function pipeVideo(sourceRes, targetRes) {
  const statusCode = sourceRes.statusCode || 200;
  
  targetRes.writeHead(statusCode, {
    'Content-Type': sourceRes.headers['content-type'] || 'video/mp4',
    'Content-Length': sourceRes.headers['content-length'] || undefined,
    'Content-Range': sourceRes.headers['content-range'] || undefined,
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
  });

  sourceRes.pipe(targetRes);
}
