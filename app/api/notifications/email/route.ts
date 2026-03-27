import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY não configurada nas variáveis de ambiente' },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const { to, subject, body, html, from } = await req.json();

    const { data, error } = await resend.emails.send({
      from: from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject: subject,
      text: body,
      html: html || `<p>${body}</p>`,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
