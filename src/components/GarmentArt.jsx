import { useState } from "react";

// Stylised garment illustrations used whenever a product has no photo.
// They pick up the selected colour, so switching colour in the product
// view recolours the garment.

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 90;
}

const SHAPES = {
  coat: {
    body: "M78 34 L100 46 L122 34 L150 46 C160 52 164 60 166 72 L176 168 L156 172 L148 106 L150 198 L50 198 L52 106 L44 172 L24 168 L34 72 C36 60 40 52 50 46 Z",
    shade: "M100 46 L122 34 L150 46 C160 52 164 60 166 72 L176 168 L156 172 L148 106 L150 198 L100 198 Z",
    lines: "M78 34 L90 90 L100 46 M122 34 L110 90 L100 46 M52 126 L148 126 M62 158 L82 158 M118 158 L138 158 M100 90 L100 198",
    dots: [[91, 104], [109, 104], [91, 142], [109, 142]],
  },
  puffer: {
    body: "M72 42 L100 50 L128 42 L154 54 C164 60 168 70 170 80 L178 152 C170 158 160 158 154 154 L148 112 L148 176 C120 184 80 184 52 176 L52 112 L46 154 C40 158 30 158 22 152 L30 80 C32 70 36 60 46 54 Z",
    extra: "M74 26 C86 18 114 18 126 26 L130 46 C116 54 84 54 70 46 Z",
    shade: "M100 50 L128 42 L154 54 C164 60 168 70 170 80 L178 152 C170 158 160 158 154 154 L148 112 L148 176 C130 181 112 182 100 182 Z",
    lines: "M52 92 Q100 102 148 92 M52 116 Q100 126 148 116 M52 140 Q100 150 148 140 M52 162 Q100 172 148 162 M30 100 Q38 104 46 102 M26 126 Q36 130 46 128 M100 50 L100 182 M76 34 Q100 40 124 34",
  },
  sweater: {
    body: "M76 40 C86 50 114 50 124 40 L152 50 C162 56 166 64 168 76 L178 160 L156 164 L148 104 L150 182 L50 182 L52 104 L44 164 L22 160 L32 76 C34 64 38 56 48 50 Z",
    shade: "M100 47 C112 46 120 43 124 40 L152 50 C162 56 166 64 168 76 L178 160 L156 164 L148 104 L150 182 L100 182 Z",
    lines: "M76 40 C86 56 114 56 124 40 M50 170 L150 170 M24 150 L45 154 M155 154 L176 150 M86 64 C78 78 94 88 86 102 C78 116 94 126 86 140 C78 154 94 160 86 170 M114 64 C106 78 122 88 114 102 C106 116 122 126 114 140 C106 154 122 160 114 170 M60 172 L60 182 M70 172 L70 182 M80 172 L80 182 M90 172 L90 182 M100 172 L100 182 M110 172 L110 182 M120 172 L120 182 M130 172 L130 182 M140 172 L140 182",
  },
  hoodie: {
    body: "M76 44 C86 52 114 52 124 44 L152 54 C162 60 166 68 168 80 L178 162 L156 166 L148 108 L150 184 L50 184 L52 108 L44 166 L22 162 L32 80 C34 68 38 60 48 54 Z",
    extra: "M70 50 C62 16 138 16 130 50 C122 60 78 60 70 50 Z",
    shade: "M100 52 C112 52 120 48 124 44 L152 54 C162 60 166 68 168 80 L178 162 L156 166 L148 108 L150 184 L100 184 Z",
    lines: "M80 48 C84 30 116 30 120 48 M92 56 L90 86 M108 56 L110 86 M68 130 L132 130 L142 166 L58 166 Z M50 174 L150 174 M24 152 L45 156 M155 156 L176 152",
  },
  trousers: {
    body: "M62 28 L138 28 L152 192 L112 192 L100 82 L88 192 L48 192 Z",
    shade: "M100 28 L138 28 L152 192 L112 192 L100 82 Z",
    lines: "M62 42 L138 42 M76 56 L68 188 M124 56 L132 188 M66 42 C72 60 84 60 88 42 M134 42 C128 60 116 60 112 42 M100 42 L100 82",
  },
  scarf: {
    body: "M58 30 C80 18 120 18 142 30 L142 62 C120 52 80 52 58 62 Z M70 56 L98 56 L102 176 L74 176 Z",
    extra: "M104 58 L132 58 L128 156 L102 156 Z",
    shade: "M104 58 L132 58 L128 156 L102 156 Z",
    lines: "M72 92 L99 92 M73 104 L100 104 M73 140 L101 140 M73 152 L101 152 M103 86 L131 86 M103 98 L130 98 M103 130 L129 130 M76 176 L75 192 M83 176 L82 192 M90 176 L90 192 M97 176 L98 192 M105 156 L104 172 M112 156 L112 172 M119 156 L120 172 M126 156 L127 172",
  },
  beanie: {
    body: "M48 132 C48 66 152 66 152 132 Z M42 126 L158 126 L158 164 L42 164 Z",
    extra: "M100 44 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0",
    shade: "M100 70 C130 72 152 96 152 132 L158 126 L158 164 L100 164 Z",
    lines: "M54 130 L54 160 M66 130 L66 160 M78 130 L78 160 M90 130 L90 160 M102 130 L102 160 M114 130 L114 160 M126 130 L126 160 M138 130 L138 160 M150 130 L150 160 M70 118 C74 96 86 82 100 78 M100 78 C114 82 126 96 130 118",
  },
  gloves: {
    body: "M34 66 C34 42 76 42 76 66 L78 128 L34 128 Z M24 94 C14 94 12 110 24 116 L34 118 L34 96 Z M32 128 L80 128 L80 160 L32 160 Z M124 66 C124 42 166 42 166 66 L166 128 L122 128 Z M176 94 C186 94 188 110 176 116 L166 118 L166 96 Z M120 128 L168 128 L168 160 L120 160 Z",
    shade: "M124 66 C124 42 166 42 166 66 L166 128 L122 128 Z",
    lines: "M40 136 L40 156 M48 136 L48 156 M56 136 L56 156 M64 136 L64 156 M72 136 L72 156 M128 136 L128 156 M136 136 L136 156 M144 136 L144 156 M152 136 L152 156 M160 136 L160 156 M36 80 C46 72 64 72 74 80 M126 80 C136 72 154 72 164 80",
  },
  boots: {
    body: "M68 32 L118 32 L120 120 C150 124 172 138 174 162 L174 178 L60 178 L62 120 Z",
    extra: "M56 178 L178 178 L178 192 L56 192 Z",
    shade: "M118 32 L120 120 C150 124 172 138 174 162 L174 178 L118 178 Z",
    lines: "M96 58 C92 76 92 96 96 114 M118 58 C114 76 114 96 118 114 M68 32 L68 18 L82 18 L82 32 M62 150 L174 150",
  },
};

export default function GarmentArt({ type = "coat", color = "#a9774f", label }) {
  const shape = SHAPES[type] || SHAPES.coat;
  const dark = isDark(color);
  const detail = dark ? "rgba(243,234,220,.32)" : "rgba(30,21,16,.32)";

  return (
    <svg className="garment-art" viewBox="0 0 200 210" role="img" aria-label={label}>
      <ellipse cx="100" cy="200" rx="70" ry="7" fill="rgba(30,21,16,.14)" />
      <g className="garment-fill" style={{ fill: color }}>
        {shape.extra && <path d={shape.extra} />}
        <path d={shape.body} fillRule="evenodd" />
      </g>
      {shape.shade && <path d={shape.shade} fill="rgba(0,0,0,.10)" />}
      {shape.extra && <path d={shape.extra} fill="rgba(0,0,0,.08)" />}
      <path d={shape.lines} fill="none" stroke={detail} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {shape.dots?.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" fill={detail} />
      ))}
    </svg>
  );
}

// Photo if the product has one (and it loads), otherwise the illustration.
export function ProductVisual({ product, color, index = 0 }) {
  const src = product.images[index];
  const [failed, setFailed] = useState(null);
  const hex = color?.hex || product.colors[0]?.hex || "#a9774f";

  if (src && failed !== src) {
    return (
      <img
        className="product-photo"
        src={src}
        alt={product.name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
      />
    );
  }
  return <GarmentArt type={product.art} color={hex} label={product.name} />;
}
