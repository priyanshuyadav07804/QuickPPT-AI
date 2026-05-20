import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
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

    // 1. Fetch details to get file URLs
    const { data: presentation, error: fetchError } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', id)
      .single();

    // Even if not in presentations, check uploads (legacy/history)
    const { data: uploadData } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', id)
      .single();

    const record = presentation || uploadData;

    if (!record) {
        // Might already be gone from DB, but let's try to clean up storage anyway if we have the ID conventions
    }

    // 2. Delete PPT from Storage
    try {
        await supabase.storage.from('pptxs').remove([`pptx/${id}.pptx`]);
    } catch (e) {
        console.error('Failed to delete PPT file:', e);
    }

    // 3. Delete PDF from Storage
    if (record?.pdf_url) {
        try {
            // Extract path from public URL
            // Format: .../storage/v1/object/public/pdfs/uploads/FILENAME
            const pdfPath = record.pdf_url.split('/pdfs/').pop();
            if (pdfPath) {
                await supabase.storage.from('pdfs').remove([pdfPath]);
            }
        } catch (e) {
            console.error('Failed to delete PDF file:', e);
        }
    }

    // 4. Delete from both tables
    const deleteResults = await Promise.all([
        supabase.from('presentations').delete().eq('id', id),
        supabase.from('uploads').delete().eq('id', id)
    ]);

    const errors = deleteResults.filter(r => r.error).map(r => r.error);
    if (errors.length > 0 && !record) {
        // If we found NO record and still got errors, maybe it's fine
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
