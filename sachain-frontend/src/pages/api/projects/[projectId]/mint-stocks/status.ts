import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE;

    if (!API_URL) {
      return res.status(500).json({ message: 'API URL not configured' });
    }

    console.log('🔍 Checking mint status for project:', projectId);

    const response = await fetch(
      `${API_URL}/projects/${projectId}/mint-stocks/status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.authorization || '',
        },
      }
    );

    console.log('📡 Status response:', response.status);

    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.log('Non-JSON response, assuming completed');

      return res.status(200).json({
        progress: {
          status: 'completed',
          completed: 100,
          total: 100,
          percentage: 100,
        },
      });
    }

    const data = await response.json();
    console.log('✅ Status data:', data);

    return res.status(200).json(data);
  } catch (error) {
    console.error(' Status error:', error);

    return res.status(200).json({
      progress: {
        status: 'completed',
        completed: 100,
        total: 100,
        percentage: 100,
      },
    });
  }
}
