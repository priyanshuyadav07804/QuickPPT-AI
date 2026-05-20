import { NextRequest, NextResponse } from 'next/server';
import { ProcessingPipeline } from '@/lib/pipeline';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { forceStep } = await req.json().catch(() => ({}));
    const pipeline = new ProcessingPipeline(id, supabase);
    
    // The pipeline.run() now handles logical stages and resumption.
    const result = await pipeline.run(forceStep);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Processing Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
