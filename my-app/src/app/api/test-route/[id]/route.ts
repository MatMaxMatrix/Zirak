import { NextRequest, NextResponse } from 'next/server';

// A simple test route to verify route handler type signatures
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  
  return NextResponse.json({ 
    message: 'Test route handler works', 
    id: id 
  });
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  
  return NextResponse.json({ 
    message: 'POST to test route handler works', 
    id: id 
  });
} 