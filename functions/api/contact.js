export async function onRequestPost({ request, env }) {
    try {
        const formData = await request.formData();

        const name = formData.get('name');
        const email = formData.get('email');
        const category = formData.get('category');
        const message = formData.get('message');
        const media = formData.get('media'); // This is a File object if present

        let attachments = [];

        // Check if media is uploaded and has a size
        if (media && media.size > 0) {
            const arrayBuffer = await media.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';

            // To avoid call stack size exceeded, chunk the string construction
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, i + chunkSize);
                binary += String.fromCharCode.apply(null, chunk);
            }

            const base64Content = btoa(binary);

            attachments.push({
                filename: media.name,
                content: base64Content
            });
        }

        const payload = {
            from: 'Lingowire Contact <hello@lingowire.com>',
            to: ['hello@lingowire.com'],  // The email address that will receive the submissions
            reply_to: email, // This allows you to directly click "Reply" to the user
            subject: `New Contact Form Submission: ${category}`,
            html: `
        <h2>New Message via Lingowire Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
      `,
            attachments: attachments.length > 0 ? attachments : undefined
        };

        // Send to Resend API
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Resend error:', errorText);
            return new Response(JSON.stringify({ error: 'Failed to send email. Verification or API key might be missing.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true, message: 'Email sent successfully!' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
