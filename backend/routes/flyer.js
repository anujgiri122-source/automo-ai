const { buildFlyerQuery } = require('../../mcp/canva-flyer');

async function handleFlyerRequest(req, res) {
  const { brandData, eventDetails } = req.body;

  if (!brandData || !eventDetails) {
    return res.status(400).json({ error: 'brandData and eventDetails required' });
  }

  const flyerQuery = buildFlyerQuery(brandData, eventDetails);

  // Canva MCP will be called by Claude Code directly
  // This route returns the prepared query for now
  res.json({
    status: 'ready',
    message: 'Flyer query prepared. Claude Code will call Canva MCP.',
    flyerQuery
  });
}

module.exports = { handleFlyerRequest };
