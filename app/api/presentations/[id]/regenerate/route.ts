import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePPTX } from '@/lib/ppt';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { layout } = await req.json();
  
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch updated presentation data
    const { data: presentation, error: fetchError } = await supabase
      .from('presentations')
      .select()
      .eq('id', id)
      .single();

    if (fetchError || !presentation) throw new Error('Presentation not found');

    const updatedTheme = { ...presentation.theme, layout };

    // 2. Generate new PPTX with chosen layout
    const pptBuffer = await generatePPTX(presentation.questions, {
      title: presentation.title,
      themeColor: updatedTheme.themeColor,
      accentColor: updatedTheme.accentColor,
      layout: layout
    });

    // 3. Upload to storage
    const fileName = `pptx/${id}.pptx`;
    const { error: uploadError } = await supabase.storage
      .from('pptxs')
      .upload(fileName, pptBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('pptxs')
      .getPublicUrl(fileName);

    // 4. Update database
    const { data, error: updateError } = await supabase
      .from('presentations')
      .update({
        pptx_url: publicUrl,
        theme: updatedTheme
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Regeneration Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
