// Offset Forge v1.4 - host script (runs inside Illustrator)

function offsetForgeCount() {
    try {
        if (app.documents.length === 0) return "0";
        var s = app.activeDocument.selection;
        if (s && s.length !== undefined) return String(s.length);
        return "0";
    } catch (e) {
        return "0";
    }
}

// ---- measuring: only VISIBLE artwork counts ----
// Bounds: skips hidden items, guides, empty paths, zero-opacity items; clipped groups use the mask.
// Thickness: estimated for outlined (filled) line art as 2 x area / perimeter.

function _ofAdd(acc, g) {
    if (g[0] < acc.l) acc.l = g[0];
    if (g[2] > acc.r) acc.r = g[2];
    if (g[1] > acc.t) acc.t = g[1];
    if (g[3] < acc.b) acc.b = g[3];
    acc.any = true;
}

function _ofIsClip(pi) {
    try {
        if (pi.typename === "CompoundPathItem") return pi.pathItems.length > 0 && pi.pathItems[0].clipping;
        return pi.clipping === true;
    } catch (e) { return false; }
}

// signed area + length of one path (beziers flattened)
function _ofFlatten(path) {
    var pts = path.pathPoints, n = pts.length, steps = 12;
    var area = 0, len = 0, i, k;
    if (n < 2) return { area: 0, len: 0 };
    var segs = path.closed ? n : n - 1;
    for (i = 0; i < segs; i++) {
        var p0 = pts[i], p1 = pts[(i + 1) % n];
        var a = p0.anchor, c1 = p0.rightDirection, c2 = p1.leftDirection, b = p1.anchor;
        var lx = a[0], ly = a[1];
        for (k = 1; k <= steps; k++) {
            var t = k / steps, u = 1 - t;
            var x = u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0];
            var y = u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1];
            area += (lx * y - x * ly) / 2;
            len += Math.sqrt((x - lx) * (x - lx) + (y - ly) * (y - ly));
            lx = x; ly = y;
        }
    }
    if (!path.closed) { // filled open paths close implicitly
        var f = pts[0].anchor;
        area += (lx * f[1] - f[0] * ly) / 2;
        len += Math.sqrt((f[0] - lx) * (f[0] - lx) + (f[1] - ly) * (f[1] - ly));
    }
    return { area: area, len: len };
}

function _ofMeasure(item, acc, noBounds) {
    var t = "", i, fl;
    try { t = item.typename; } catch (e0) { return; }
    try { if (item.hidden) return; } catch (e1) {}
    try { if (item.layer && item.layer.visible === false) return; } catch (e2) {}
    try { if (item.opacity === 0) return; } catch (e3) {}

    if (t === "GroupItem") {
        var clipItem = null;
        try {
            if (item.clipped) {
                for (i = 0; i < item.pageItems.length; i++) {
                    if (_ofIsClip(item.pageItems[i])) { clipItem = item.pageItems[i]; break; }
                }
            }
        } catch (e4) {}
        if (clipItem) {
            if (!noBounds) _ofAdd(acc, clipItem.geometricBounds);
            for (i = 0; i < item.pageItems.length; i++) {
                if (item.pageItems[i] !== clipItem) _ofMeasure(item.pageItems[i], acc, true);
            }
            return;
        }
        for (i = 0; i < item.pageItems.length; i++) _ofMeasure(item.pageItems[i], acc, noBounds);
        return;
    }
    if (t === "PathItem") {
        try { if (item.guides) return; } catch (e5) {}
        try { if (item.clipping) return; } catch (e6) {}
        var filled = false, stroked = false;
        try { filled = item.filled; stroked = item.stroked; } catch (e7) {}
        if (!filled && !stroked) return;
        if (!noBounds) _ofAdd(acc, item.geometricBounds);
        if (filled) {
            try {
                fl = _ofFlatten(item);
                acc.area += Math.abs(fl.area);
                acc.perim += fl.len;
            } catch (e8) {}
        }
        return;
    }
    if (t === "CompoundPathItem") {
        var anyFill = false, sum = 0, per = 0, vis = false;
        try {
            for (i = 0; i < item.pathItems.length; i++) {
                var pi = item.pathItems[i];
                if (pi.filled || pi.stroked) vis = true;
                if (pi.filled) {
                    anyFill = true;
                    fl = _ofFlatten(pi);
                    sum += fl.area;
                    per += fl.len;
                }
            }
        } catch (e9) {}
        if (!vis) return;
        if (!noBounds) _ofAdd(acc, item.geometricBounds);
        if (anyFill) { acc.area += Math.abs(sum); acc.perim += per; }
        return;
    }
    // text, symbols, placed/raster items, etc.
    if (!noBounds) _ofAdd(acc, item.geometricBounds);
}

// Returns "count|width|height|thickness" for the visible part of the selection (px/pt)
function offsetForgeInfo() {
    try {
        if (app.documents.length === 0) return "0|0|0|0";
        var sel = app.activeDocument.selection;
        if (!sel || sel.length === undefined || sel.length === 0) return "0|0|0|0";
        var acc = { l: 1e9, r: -1e9, t: -1e9, b: 1e9, any: false, area: 0, perim: 0 };
        var i;
        for (i = 0; i < sel.length; i++) {
            try { _ofMeasure(sel[i], acc, false); } catch (e) {}
        }
        if (!acc.any) return sel.length + "|0|0|0";
        var w = Math.round((acc.r - acc.l) * 10000) / 10000;
        var h = Math.round((acc.t - acc.b) * 10000) / 10000;
        var th = 0;
        if (acc.perim > 0 && acc.area > 0) th = Math.round((2 * acc.area / acc.perim) * 10000) / 10000;
        return sel.length + "|" + w + "|" + h + "|" + th;
    } catch (err) {
        return "0|0|0|0";
    }
}

function offsetForgeApply(offset, joinType, miterLimit, expand, keepOriginal) {
    try {
        if (app.documents.length === 0) return "nodoc";
        var doc = app.activeDocument;
        if (!doc.selection || doc.selection.length === undefined || doc.selection.length === 0) return "none";

        // jntp: 0 = miter, 1 = round, 2 = bevel
        var effectXML =
            '<LiveEffect name="Adobe Offset Path">' +
            '<Dict data="I jntp ' + joinType +
            ' R mlim ' + miterLimit +
            ' R ofst ' + offset + '"/>' +
            '</LiveEffect>';

        var originals = [];
        var i;
        for (i = 0; i < doc.selection.length; i++) originals.push(doc.selection[i]);

        doc.selection = null;
        var finalItems = [];

        for (i = 0; i < originals.length; i++) {
            var original = originals[i];
            var corrected = null;
            try {
                corrected = original.duplicate();
                doc.selection = null;
                corrected.selected = true;

                corrected.applyEffect(effectXML);
                app.redraw();

                var produced = [];
                var s;

                if (expand) {
                    try {
                        app.executeMenuCommand("expandStyle");
                        app.redraw();
                    } catch (expandError) {
                        try { corrected.remove(); } catch (e1) {}
                        continue;
                    }
                    for (s = 0; s < doc.selection.length; s++) produced.push(doc.selection[s]);
                } else {
                    produced.push(corrected);
                }

                if (produced.length > 0) {
                    if (!keepOriginal) original.remove();
                    for (s = 0; s < produced.length; s++) finalItems.push(produced[s]);
                } else {
                    try { corrected.remove(); } catch (e2) {}
                }
            } catch (e) {
                try { if (corrected) corrected.remove(); } catch (e3) {}
            }
        }

        doc.selection = null;
        for (i = 0; i < finalItems.length; i++) {
            try { finalItems[i].selected = true; } catch (e4) {}
        }
        app.redraw();

        if (finalItems.length === 0) return "err:Offset could not be applied to this selection";
        return "ok:" + originals.length;
    } catch (err) {
        return "err:" + err;
    }
}
