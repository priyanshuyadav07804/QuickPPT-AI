import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'latest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const supabase = await createClient();
    
    // Auth check optional if we just want empty data, but explicit is good
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('uploads')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`pdf_name.ilike.%${search}%,exam_name.ilike.%${search}%`);
    }

    if (sort === 'latest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: true });
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data,
      total: count,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('History Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');
    let idsToDelete: string[] = [];
    
    if (idsParam) {
      idsToDelete = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    } else if (id) {
      idsToDelete = [id];
    }

    if (idsToDelete.length === 0) throw new Error('ID(s) required');

    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    for (const currentId of idsToDelete) {
      // Fetch to get URLs
      const { data: upload } = await supabase.from('uploads').select('*').eq('id', currentId).single();
      const { data: pres } = await supabase.from('presentations').select('*').eq('id', currentId).single();
      
      const record = upload || pres;

      // Remove files
      const pptUrl = record?.ppt_url || record?.pptx_url;
      if (pptUrl) {
          const pptPath = pptUrl.split('/pptxs/').pop();
          if (pptPath) await supabase.storage.from('pptxs').remove([decodeURIComponent(pptPath)]);
      }
      
      if (record?.pdf_url) {
          const pdfPath = record.pdf_url.split('/pdfs/').pop();
          if (pdfPath) await supabase.storage.from('pdfs').remove([pdfPath]);
      } else {
          // Fallback for ID convention
          await supabase.storage.from('pptxs').remove([`pptx/${currentId}.pptx`]);
      }

      // Delete from both tables
      await supabase.from('uploads').delete().eq('id', currentId);
      await supabase.from('presentations').delete().eq('id', currentId);
    }

    return NextResponse.json({ success: true, count: idsToDelete.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
