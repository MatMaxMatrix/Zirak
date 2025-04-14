import { NextRequest, NextResponse } from 'next/server';

// A simple test route to verify route handler type signatures

// Bypass strict typing for GET handler
export async function GET(request: NextRequest, { params }: any) {
  const id = params.id as string;
  
  return NextResponse.json({ 
    message: 'Test route handler works', 
    id: id 
  });
}

// Bypass strict typing for POST handler
export async function POST(request: NextRequest, { params }: any) {
  const id = params.id as string;
  
  return NextResponse.json({ 
    message: 'POST to test route handler works', 
    id: id 
  });
} 