import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePPTX } from '@/lib/ppt';

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

    const { data: presentation, error: fetchError } = await supabase
      .from('presentations')
      .select()
      .eq('id', id)
      .single();

    if (fetchError || !presentation) throw new Error('Presentation not found');

    const pptBuffer = await generatePPTX(presentation.questions, {
      title: presentation.title,
      themeColor: presentation.theme.themeColor,
      accentColor: presentation.theme.accentColor
    });

    const fileName = `pptx/${id}.pptx`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pptxs')
      .upload(fileName, pptBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true
      });

    if (uploadError) {
      if (uploadError.message.includes("Bucket not found")) {
        throw new Error("Storage bucket 'pptxs' not found. Please create a public bucket named 'pptxs' in Supabase.");
      }
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('pptxs')
      .getPublicUrl(fileName);

    // Save to the new uploads table for history tracking
    const { error: historyError } = await supabase
      .from('uploads')
      .upsert([
        {
          id: id,
          pdf_name: presentation.pdf_url.split('/').pop() || presentation.title,
          pdf_url: presentation.pdf_url,
          ppt_url: publicUrl,
          exam_name: presentation.title,
          extracted_json: presentation.questions,
          total_questions: presentation.questions.length,
          user_id: user.id
        }
      ]);

    if (historyError) console.error('History save failed:', historyError);

    const { data, error: updateError } = await supabase
      .from('presentations')
      .update({
        pptx_url: publicUrl,
        status: 'completed'
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
