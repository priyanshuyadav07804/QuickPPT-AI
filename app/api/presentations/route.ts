import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PipelineStep } from '@/lib/pipeline-types';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { pdf_url, title, theme_color, theme } = await req.json();
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('presentations')
      .insert([
        {
          title,
          pdf_url,
          status: PipelineStep.UPLOADED,
          theme: theme || { themeColor: theme_color || '#8b5cf6', accentColor: '#ffffff', layout: 'standard' },
          user_id: user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // immediately log to uploads table for history to catch it
    await supabase.from('uploads').insert([{
      id: data.id,
      pdf_name: title,
      pdf_url: pdf_url,
      pipeline_status: PipelineStep.UPLOADED,
      user_id: user.id
    }]);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
