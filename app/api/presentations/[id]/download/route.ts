import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePPTX } from '@/lib/ppt';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const layout = (searchParams.get('layout') as 'standard' | 'solving') || 'standard';
  const format = (searchParams.get('format') as 'pptx' | 'pdf') || 'pptx';
  const customFilename = searchParams.get('filename');
  const languageMode = (searchParams.get('languageMode') as 'both' | 'english' | 'hindi') || 'both';
  
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: presentation, error: fetchError } = await supabase
      .from('presentations')
      .select()
      .eq('id', id)
      .single();

    if (fetchError || !presentation) throw new Error('Presentation not found');

    const pptBuffer = await generatePPTX(presentation.questions, {
      title: presentation.title,
      themeColor: presentation.theme.themeColor,
      accentColor: presentation.theme.accentColor,
      layout: layout,
      languageMode: languageMode
    });

    const baseName = customFilename || presentation.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `${baseName}-${layout}.pptx`;

    return new Response(pptBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    console.error('API Download ERROR:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
