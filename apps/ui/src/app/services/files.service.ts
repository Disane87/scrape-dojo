import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root',
})
export class FilesService {
  private http = inject(HttpClient);
  private apiUrl = '/api/files';

  downloadFile(path: string): void {
    const downloadUrl = `${this.apiUrl}/download`;

    // Sende POST-Request und lade die Datei herunter
    this.http
      .post(
        downloadUrl,
        { path },
        {
          responseType: 'blob',
          observe: 'response',
        },
      )
      .subscribe({
        next: (response) => {
          // Extrahiere Dateinamen aus dem Content-Disposition Header oder vom Pfad
          let filename = 'download';
          const contentDisposition = response.headers.get(
            'content-disposition',
          );

          if (contentDisposition) {
            // Versuche zuerst filename*= (RFC 5987)
            let filenameMatch = contentDisposition.match(
              /filename\*=UTF-8''(.+)/i,
            );
            if (filenameMatch && filenameMatch[1]) {
              filename = decodeURIComponent(filenameMatch[1]);
            } else {
              // Fallback auf filename= mit Anführungszeichen
              filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
              if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
              } else {
                // Fallback ohne Anführungszeichen
                filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
                if (filenameMatch && filenameMatch[1]) {
                  filename = filenameMatch[1].trim();
                }
              }
            }
          } else {
            // Fallback: Extrahiere Dateinamen aus dem Pfad
            filename = path.split(/[/\\]/).pop() || 'download';
          }

          // Erstelle Blob-URL und triggere Download
          const blob = response.body;
          if (blob) {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link); // Füge Link zum DOM hinzu
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        },
        error: (error) => {
          console.error('❌ Download error:', error);
          alert(`Fehler beim Herunterladen der Datei: ${error.message}`);
        },
      });
  }
}
