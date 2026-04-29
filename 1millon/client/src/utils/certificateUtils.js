export const generateCertificate = (ad) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  // Fondo premium oscuro
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Borde exterior dorado macizo
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 14;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
  
  // Borde interior fino
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.strokeRect(65, 65, canvas.width - 130, canvas.height - 130);

  // Titulos
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eab308';
  ctx.font = 'bold 44px Arial';
  ctx.fillText('CERTIFICADO DE PROPIEDAD DIGITAL', canvas.width / 2, 160);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '28px Arial';
  ctx.letterSpacing = '2px';
  ctx.fillText('MONUMENTO HISTÓRICO DE LOS 100,000 ESPACIOS', canvas.width / 2, 215);

  const drawContent = (imageObj) => {
      // Renderizar logo con resplandor
      if (imageObj) {
          ctx.shadowColor = 'rgba(234, 179, 8, 0.4)';
          ctx.shadowBlur = 60;
          ctx.drawImage(imageObj, canvas.width / 2 - 125, 270, 250, 250);
          ctx.shadowColor = 'transparent';
      } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(canvas.width / 2 - 125, 270, 250, 250);
      }

      // Borde decorativo para el logo
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.strokeRect(canvas.width / 2 - 125, 270, 250, 250);

      // Textos legales / ceremoniales
      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 34px Georgia, serif';
      ctx.fillText('Se certifica mediante el presente documento que', canvas.width / 2, 600);

      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 56px Arial';
      const displayName = ad.name || ad.url.replace(/^https?:\/\//, '');
      ctx.fillText(displayName.toUpperCase(), canvas.width / 2, 680);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '30px Arial';
      ctx.fillText(`es legítimo y absoluto titular del Espacio #${ad.id} en la cuadrícula ${ad.sector.toUpperCase()}.`, canvas.width / 2, 750);

      // Caja de estadisticas técnicas
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(canvas.width / 2 - 400, 800, 800, 130);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width / 2 - 400, 800, 800, 130);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 22px Arial';
      ctx.fillText('NIVEL DE TAMAÑO', canvas.width / 2 - 200, 845);
      ctx.fillText('COORDENADAS EXACTAS (X, Y)', canvas.width / 2 + 200, 845);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      const typeBadge = ad.width === 50 ? 'PREMIUM (25 Unidades)' : (ad.width >= 20 ? 'COMBO (4 Unidades)' : 'BÁSICO (1 Unidad)');
      ctx.fillText(`${ad.width}x${ad.height} px`, canvas.width / 2 - 200, 890);
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(typeBadge, canvas.width / 2 - 200, 915);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      ctx.fillText(`X:${ad.x} | Y:${ad.y}`, canvas.width / 2 + 200, 890);

      // Fecha y Footer
      ctx.fillStyle = '#64748b';
      ctx.font = '22px Arial';
      const d = new Date();
      ctx.fillText(`Acreditado formalmente el ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} con exposición a perpetuidad.`, canvas.width / 2, 990);

      // Trigger Local DL
      const link = document.createElement('a');
      link.download = `Certificado_VIP_${ad.id}_${(ad.name || 'Digital').replace(/[^a-zA-Z0-9]/g, '')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
  };

  if (ad.image) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = ad.image;
      img.onload = () => drawContent(img);
      img.onerror = () => drawContent(null);
  } else {
      drawContent(null);
  }
};
