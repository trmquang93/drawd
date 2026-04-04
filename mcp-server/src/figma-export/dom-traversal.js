/**
 * DOM traversal function injected into a Puppeteer page via page.evaluate().
 *
 * IMPORTANT: This function must remain entirely self-contained — no imports,
 * no external closures. Every helper is defined inside domTraversalFn's scope.
 * Puppeteer serializes the function via .toString() and re-executes it in Chrome.
 *
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @returns {Object} Figma-compatible node tree rooted at a FRAME node
 */
export function domTraversalFn(viewportWidth, viewportHeight) {
  let _id = 1;
  function genId() { return String(_id++); }

  // ─── Color parsing ────────────────────────────────────────────────────────

  function parseRgba(css) {
    if (!css || css === 'transparent') return null;
    const m = css.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (m) {
      return {
        r: parseFloat(m[1]) / 255,
        g: parseFloat(m[2]) / 255,
        b: parseFloat(m[3]) / 255,
        a: m[4] !== undefined ? parseFloat(m[4]) : 1,
      };
    }
    const hex = css.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      const h = hex[1];
      if (h.length === 3) {
        return {
          r: parseInt(h[0] + h[0], 16) / 255,
          g: parseInt(h[1] + h[1], 16) / 255,
          b: parseInt(h[2] + h[2], 16) / 255,
          a: 1,
        };
      }
      if (h.length === 6) {
        return {
          r: parseInt(h.slice(0, 2), 16) / 255,
          g: parseInt(h.slice(2, 4), 16) / 255,
          b: parseInt(h.slice(4, 6), 16) / 255,
          a: 1,
        };
      }
    }
    return null;
  }

  function toFigmaColor(c) {
    if (!c) return null;
    return { r: c.r, g: c.g, b: c.b };
  }

  function solidFill(c) {
    if (!c) return null;
    return { type: 'SOLID', color: toFigmaColor(c), opacity: c.a };
  }

  // ─── Box-shadow → DROP_SHADOW / INNER_SHADOW ──────────────────────────────

  function parseBoxShadow(value) {
    if (!value || value === 'none') return null;
    const inset = /\binset\b/.test(value);
    // Extract the color token (rgba/rgb/hex) — search from end for robustness
    const colorRe = /(rgba?\([^)]+\)|#[0-9a-f]{3,8})/gi;
    let colorMatch = null;
    let m;
    while ((m = colorRe.exec(value)) !== null) colorMatch = m;
    if (!colorMatch) return null;
    const color = parseRgba(colorMatch[1]);
    if (!color) return null;

    // The remaining tokens before/after the color are offsets/blur/spread
    const withoutColor = value
      .replace(/\binset\b/gi, '')
      .replace(colorMatch[1], '')
      .trim();
    const nums = withoutColor.match(/-?[\d.]+/g) || [];

    return {
      type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
      color: { r: color.r, g: color.g, b: color.b, a: color.a },
      offset: { x: parseFloat(nums[0] || 0), y: parseFloat(nums[1] || 0) },
      radius: parseFloat(nums[2] || 0),
      spread: parseFloat(nums[3] || 0),
      visible: true,
      blendMode: 'NORMAL',
    };
  }

  // ─── CSS fills → Figma fills ──────────────────────────────────────────────

  function extractFills(cs) {
    const fills = [];
    const bg = parseRgba(cs.backgroundColor);
    if (bg) fills.push(solidFill(bg));

    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      if (cs.backgroundImage.includes('gradient')) {
        // Represent as a placeholder gradient — a full gradient parser is out of scope for v1
        fills.push({ type: 'GRADIENT_LINEAR', _raw: cs.backgroundImage });
      }
    }
    return fills;
  }

  // ─── CSS borders → Figma strokes ─────────────────────────────────────────

  function extractStrokes(cs) {
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw === 0) return { strokes: [], strokeWeight: 0 };
    const bc = parseRgba(cs.borderTopColor);
    const strokes = bc ? [solidFill(bc)] : [];
    return { strokes, strokeWeight: bw };
  }

  // ─── CSS box-shadow → Figma effects ──────────────────────────────────────

  function extractEffects(cs) {
    const effects = [];
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      // Multiple shadows are comma-separated, but rgba() contains commas.
      // For v1 we parse only the first shadow.
      const shadow = parseBoxShadow(cs.boxShadow);
      if (shadow) effects.push(shadow);
    }
    return effects;
  }

  // ─── Border radius ────────────────────────────────────────────────────────

  function extractCornerRadius(cs) {
    const tl = parseFloat(cs.borderTopLeftRadius) || 0;
    const tr = parseFloat(cs.borderTopRightRadius) || 0;
    const br = parseFloat(cs.borderBottomRightRadius) || 0;
    const bl = parseFloat(cs.borderBottomLeftRadius) || 0;
    if (tl === tr && tr === br && br === bl) return { cornerRadius: tl };
    return { cornerRadius: 0, rectangleCornerRadii: [tl, tr, br, bl] };
  }

  // ─── Flex alignment → Figma auto-layout ────────────────────────────────────

  function mapJustifyContent(value) {
    switch (value) {
      case 'center': return 'CENTER';
      case 'flex-end': case 'end': return 'MAX';
      case 'space-between': return 'SPACE_BETWEEN';
      case 'space-around': case 'space-evenly': return 'SPACE_EVENLY';
      default: return 'MIN';
    }
  }

  function mapAlignItems(value) {
    switch (value) {
      case 'center': return 'CENTER';
      case 'flex-end': case 'end': return 'MAX';
      case 'baseline': return 'BASELINE';
      default: return 'MIN';
    }
  }

  // ─── Text align ───────────────────────────────────────────────────────────

  function cssTextAlign(align) {
    if (align === 'center') return 'CENTER';
    if (align === 'right' || align === 'end') return 'RIGHT';
    if (align === 'justify') return 'JUSTIFIED';
    return 'LEFT';
  }

  // ─── Build a TEXT node for a pure-text element ────────────────────────────

  function makeTextNode(el, rect, cs, parentLeft, parentTop) {
    const text = el.textContent.trim();
    if (!text) return null;
    const color = parseRgba(cs.color);
    const fills = color ? [solidFill(color)] : [];

    let textDeco = 'NONE';
    if (cs.textDecoration.includes('underline')) textDeco = 'UNDERLINE';
    else if (cs.textDecoration.includes('line-through')) textDeco = 'STRIKETHROUGH';

    const lh = parseFloat(cs.lineHeight);
    const fs = parseFloat(cs.fontSize) || 16;
    const lineHeightPx = isNaN(lh) ? fs * 1.2 : lh;
    const singleLine = rect.height < lineHeightPx * 1.5;

    return {
      id: genId(),
      type: 'TEXT',
      name: text.slice(0, 50),
      x: rect.left - parentLeft,
      y: rect.top - parentTop,
      width: Math.ceil(rect.width),
      height: rect.height,
      singleLine,
      opacity: parseFloat(cs.opacity),
      characters: text,
      style: {
        fontFamily: (cs.fontFamily || 'Inter').split(',')[0].replace(/['"]/g, '').trim(),
        fontPostScriptName: null,
        fontSize: fs,
        fontWeight: parseInt(cs.fontWeight) || 400,
        italic: cs.fontStyle === 'italic',
        lineHeightPx,
        lineHeightUnit: 'PIXELS',
        letterSpacing: parseFloat(cs.letterSpacing) || 0,
        textAlignHorizontal: cssTextAlign(cs.textAlign),
        textAlignVertical: 'TOP',
        textDecoration: textDeco,
        fills,
      },
    };
  }

  // ─── Semantic layer naming ────────────────────────────────────────────────

  const SEMANTIC_TAGS = {
    button: 'Button', a: 'Link', nav: 'Nav', header: 'Header',
    footer: 'Footer', main: 'Main', section: 'Section', article: 'Article',
    aside: 'Aside', form: 'Form', ul: 'List', ol: 'List', li: 'Item',
    h1: 'Title', h2: 'Heading', h3: 'Heading', h4: 'Heading',
    h5: 'Heading', h6: 'Heading', p: 'Text', label: 'Label',
    img: 'Image', svg: 'Icon', select: 'Select', textarea: 'Textarea',
    table: 'Table', tr: 'Row', td: 'Cell', th: 'Cell',
  };

  function getNodeName(el, tag) {
    if (el.id) return el.id;
    const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    if (tag === 'input' || tag === 'textarea') {
      const ph = el.getAttribute && el.getAttribute('placeholder');
      if (ph) return ph;
      const type = (el.getAttribute && el.getAttribute('type')) || 'text';
      return type + ' Input';
    }
    const cls = el.className;
    if (cls && typeof cls === 'string' && cls.trim()) {
      return cls.trim().split(/\s+/)[0];
    }
    return SEMANTIC_TAGS[tag] || tag;
  }

  // ─── Main traversal ───────────────────────────────────────────────────────

  const SKIP_TAGS = new Set([
    'script', 'style', 'head', 'meta', 'link',
    'noscript', 'template', 'slot',
  ]);

  function resolveAlignSelf(cs, parentAlignItems) {
    if (!parentAlignItems) return 'AUTO';
    const selfAlign = cs.alignSelf;
    const effective = (selfAlign === 'auto' || selfAlign === 'normal')
      ? parentAlignItems
      : selfAlign;
    return (effective === 'stretch' || effective === 'normal') ? 'STRETCH' : 'AUTO';
  }

  // Returns true when an element carries its own visible background or border,
  // meaning it needs a FRAME node to preserve that visual styling.
  function hasVisualContainer(cs) {
    const bg = parseRgba(cs.backgroundColor);
    if (bg && bg.a > 0.01) return true;
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') return true;
    const bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw > 0) {
      const bc = parseRgba(cs.borderTopColor);
      if (bc && bc.a > 0.01) return true;
    }
    return false;
  }

  function traverse(el, parentLeft, parentTop, parentAlignItems) {
    if (el.nodeType !== 1) return null;

    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return null;

    const rect = el.getBoundingClientRect();
    // Skip invisible or zero-size elements
    if (rect.width < 1 && rect.height < 1) return null;
    if (rect.bottom < 0 || rect.right < 0) return null;
    if (rect.top > viewportHeight || rect.left > viewportWidth) return null;

    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;

    // Pure-text leaf: no child elements, has text content
    if (el.childElementCount === 0 && el.textContent.trim()) {
      const textNode = makeTextNode(el, rect, cs, parentLeft, parentTop);
      if (!textNode) return null;

      // If this leaf also has its own background/border, wrap it in a FRAME so
      // those fills/strokes survive in Figma (e.g. an avatar circle with initials,
      // a badge, a styled pill label). Without the wrapper the background is lost.
      if (hasVisualContainer(cs)) {
        const fills = extractFills(cs);
        const { strokes, strokeWeight } = extractStrokes(cs);
        const effects = extractEffects(cs);
        const cornerProps = extractCornerRadius(cs);
        const isFlexRow = cs.display === 'flex' && (cs.flexDirection === 'row' || cs.flexDirection === 'row-reverse');
        const isFlexCol = cs.display === 'flex' && (cs.flexDirection === 'column' || cs.flexDirection === 'column-reverse');
        const hasAutoLayout = isFlexRow || isFlexCol;

        // In auto-layout frames, padding is applied by Figma automatically so
        // the child sits at the origin. In non-auto-layout frames, children are
        // positioned absolutely and must be offset by the CSS padding manually.
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pr = parseFloat(cs.paddingRight) || 0;
        const pt = parseFloat(cs.paddingTop) || 0;
        textNode.x = hasAutoLayout ? 0 : pl;
        textNode.y = hasAutoLayout ? 0 : pt;
        if (!hasAutoLayout && (pl + pr) > 0) {
          textNode.width = Math.max(Math.ceil(rect.width) - pl - pr, 1);
        }
        textNode.stackChildAlignSelf = 'AUTO';

        return {
          id: genId(),
          type: 'FRAME',
          name: getNodeName(el, tag),
          x: rect.left - parentLeft,
          y: rect.top - parentTop,
          width: rect.width,
          height: rect.height,
          opacity: parseFloat(cs.opacity) || 1,
          fills,
          strokes,
          strokeWeight,
          strokeAlign: 'INSIDE',
          effects,
          ...cornerProps,
          clipsContent: cs.overflow === 'hidden' || cs.overflow === 'clip',
          layoutMode: isFlexRow ? 'HORIZONTAL' : isFlexCol ? 'VERTICAL' : 'NONE',
          primaryAxisAlignItems: (isFlexRow || isFlexCol) ? mapJustifyContent(cs.justifyContent) : 'MIN',
          counterAxisAlignItems: (isFlexRow || isFlexCol) ? mapAlignItems(cs.alignItems) : 'MIN',
          primaryGrow: parseFloat(cs.flexGrow) || 0,
          paddingLeft: parseFloat(cs.paddingLeft) || 0,
          paddingRight: parseFloat(cs.paddingRight) || 0,
          paddingTop: parseFloat(cs.paddingTop) || 0,
          paddingBottom: parseFloat(cs.paddingBottom) || 0,
          itemSpacing: parseFloat(cs.gap) || 0,
          stackChildAlignSelf: resolveAlignSelf(cs, parentAlignItems),
          children: [textNode],
        };
      }

      textNode.stackChildAlignSelf = resolveAlignSelf(cs, parentAlignItems);
      return textNode;
    }

    // Container node
    const fills = extractFills(cs);
    const { strokes, strokeWeight } = extractStrokes(cs);
    const effects = extractEffects(cs);
    const cornerProps = extractCornerRadius(cs);
    const opacity = parseFloat(cs.opacity);

    // Auto-layout
    const isFlexRow = cs.display === 'flex' && (cs.flexDirection === 'row' || cs.flexDirection === 'row-reverse');
    const isFlexCol = cs.display === 'flex' && (cs.flexDirection === 'column' || cs.flexDirection === 'column-reverse');

    const nodeType = tag === 'img' ? 'RECTANGLE' : 'FRAME';

    // <img> gets an IMAGE fill placeholder
    if (tag === 'img') {
      fills.unshift({ type: 'IMAGE', scaleMode: 'FILL', imageHash: null });
    }

    // Recurse into children
    const children = [];
    const childParentAlignItems = (isFlexRow || isFlexCol) ? cs.alignItems : undefined;
    for (const child of el.children) {
      const childNode = traverse(child, rect.left, rect.top, childParentAlignItems);
      if (childNode) children.push(childNode);
    }

    // For form inputs: capture the visible text (value or placeholder) as a
    // child TEXT node so Figma shows the field content rather than an empty box.
    if (tag === 'input' || tag === 'textarea') {
      const inputType = (el.getAttribute && el.getAttribute('type')) || 'text';
      const isPassword = inputType === 'password';
      const displayText = isPassword
        ? (el.value ? '•'.repeat(el.value.length) : '')
        : (el.value || (el.getAttribute && el.getAttribute('placeholder')) || '');

      if (displayText) {
        const color = parseRgba(cs.color);
        const fs = parseFloat(cs.fontSize) || 16;
        const lh = parseFloat(cs.lineHeight);
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pt = parseFloat(cs.paddingTop) || 0;
        const inputLineHeightPx = isNaN(lh) ? fs * 1.2 : lh;
        const inputHeight = Math.max(rect.height - pt - (parseFloat(cs.paddingBottom) || 0), 1);
        const isPlaceholder = !el.value;
        // Placeholder text is typically rendered at lower opacity
        const textOpacity = isPlaceholder ? 0.5 : 1;
        children.push({
          id: genId(),
          type: 'TEXT',
          name: displayText.slice(0, 50),
          x: pl,
          y: pt,
          width: Math.max(rect.width - pl - (parseFloat(cs.paddingRight) || 0), 1),
          height: inputHeight,
          singleLine: inputHeight < inputLineHeightPx * 1.5,
          opacity: textOpacity,
          stackChildAlignSelf: 'AUTO',
          characters: displayText,
          style: {
            fontFamily: (cs.fontFamily || 'Inter').split(',')[0].replace(/['"]/g, '').trim(),
            fontPostScriptName: null,
            fontSize: fs,
            fontWeight: parseInt(cs.fontWeight) || 400,
            italic: cs.fontStyle === 'italic',
            lineHeightPx: inputLineHeightPx,
            lineHeightUnit: 'PIXELS',
            letterSpacing: parseFloat(cs.letterSpacing) || 0,
            textAlignHorizontal: cssTextAlign(cs.textAlign),
            textAlignVertical: 'CENTER',
            textDecoration: 'NONE',
            fills: color ? [solidFill(color)] : [],
          },
        });
      }
    }

    // Handle direct inline text nodes (mixed content)
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        const text = child.textContent.trim();
        if (!text) continue;
        const color = parseRgba(cs.color);
        const fs = parseFloat(cs.fontSize) || 16;
        const lh = parseFloat(cs.lineHeight);
        const inlineLineHeightPx = isNaN(lh) ? fs * 1.2 : lh;
        children.push({
          id: genId(),
          type: 'TEXT',
          name: text.slice(0, 50),
          x: 0, y: 0,
          width: rect.width, height: rect.height,
          singleLine: rect.height < inlineLineHeightPx * 1.5,
          opacity: 1,
          stackChildAlignSelf: 'AUTO',
          characters: text,
          style: {
            fontFamily: (cs.fontFamily || 'Inter').split(',')[0].replace(/['"]/g, '').trim(),
            fontPostScriptName: null,
            fontSize: fs,
            fontWeight: parseInt(cs.fontWeight) || 400,
            italic: cs.fontStyle === 'italic',
            lineHeightPx: inlineLineHeightPx,
            lineHeightUnit: 'PIXELS',
            letterSpacing: parseFloat(cs.letterSpacing) || 0,
            textAlignHorizontal: cssTextAlign(cs.textAlign),
            textAlignVertical: 'TOP',
            textDecoration: 'NONE',
            fills: color ? [solidFill(color)] : [],
          },
        });
      }
    }

    const elName = getNodeName(el, tag);

    return {
      id: genId(),
      type: nodeType,
      name: elName,
      x: rect.left - parentLeft,
      y: rect.top - parentTop,
      width: rect.width,
      height: rect.height,
      opacity,
      fills,
      strokes,
      strokeWeight,
      strokeAlign: 'INSIDE',
      effects,
      ...cornerProps,
      clipsContent: cs.overflow === 'hidden' || cs.overflow === 'clip',
      layoutMode: isFlexRow ? 'HORIZONTAL' : isFlexCol ? 'VERTICAL' : 'NONE',
      primaryAxisAlignItems: (isFlexRow || isFlexCol) ? mapJustifyContent(cs.justifyContent) : 'MIN',
      counterAxisAlignItems: (isFlexRow || isFlexCol) ? mapAlignItems(cs.alignItems) : 'MIN',
      primaryGrow: parseFloat(cs.flexGrow) || 0,
      paddingLeft: parseFloat(cs.paddingLeft) || 0,
      paddingRight: parseFloat(cs.paddingRight) || 0,
      paddingTop: parseFloat(cs.paddingTop) || 0,
      paddingBottom: parseFloat(cs.paddingBottom) || 0,
      itemSpacing: parseFloat(cs.gap) || 0,
      stackChildAlignSelf: resolveAlignSelf(cs, parentAlignItems),
      children,
    };
  }

  // Root frame wrapping the full viewport
  const bodyCs = window.getComputedStyle(document.body);
  const bodyBg = parseRgba(bodyCs.backgroundColor);

  const root = {
    id: genId(),
    type: 'FRAME',
    name: 'Converted Screen',
    x: 0, y: 0,
    width: viewportWidth,
    height: viewportHeight,
    opacity: 1,
    fills: bodyBg
      ? [{ type: 'SOLID', color: toFigmaColor(bodyBg), opacity: bodyBg.a }]
      : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }],
    strokes: [],
    strokeWeight: 0,
    strokeAlign: 'INSIDE',
    effects: [],
    cornerRadius: 0,
    clipsContent: true,
    layoutMode: 'NONE',
    paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
    itemSpacing: 0,
    children: [],
  };

  for (const child of document.body.children) {
    const node = traverse(child, 0, 0);
    if (node) root.children.push(node);
  }

  return root;
}
