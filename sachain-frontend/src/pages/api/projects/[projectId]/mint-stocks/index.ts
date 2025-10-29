import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE;

    if (!API_URL) {
      console.error('NEXT_PUBLIC_KYC_API_BASE not configured');
      return res.status(500).json({ message: 'API URL not configured' });
    }

    console.log('🪙 Proxying mint request for project:', projectId);

    const response = await fetch(`${API_URL}/projects/${projectId}/mint-stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log('✅ Mint response:', response.status);

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('❌ Mint proxy error:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}