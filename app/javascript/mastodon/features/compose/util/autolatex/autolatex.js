/* eslint-disable */
// Copyright (c) 2018 Christian Lawson-Perfect <christianperfect@gmail.com>
// Based on the list of TeX to unicode replacements from UnicodeIt
//

import {replacements, combiningmarks, subsuperscripts} from './data.js';

function is_math_mode(str) {
    let state = '';
    const bits = str.match(/\\[\(\)\[\]]/g);
    if(!bits) {
        return false;
    }
    for(let delimit of bits) {
        switch(state) {
            case '\\(':
                if(delimit=='\\)') {
                    state = '';
                }
                break;
            case '\\[':
                if(delimit=='\\]') {
                    state = '';
                }
                break;
            default:
                if(delimit=='\\(' || delimit=='\\[') {
                    state = delimit;
                }
        }
    }
    return state != '';
}

const normal_letters = replacements.map(([from,to])=>[from.match(/^\\mathit\{(.)\}$/),to]).filter(([m,to])=>m).map(([m,to])=>[m[1],to]);

export const macros = replacements.concat(subsuperscripts,normal_letters);

macros.sort((a,b)=>{
    a = a[0].length;
    b = b[0].length;
    return a.length>b.length ? -1 : a.length<b.length ? 1 : 0;
});

export function try_replace(elem) {
    const pos = elem.selectionStart;
    const value = elem.value;
    if(is_math_mode(value.slice(0,pos))) {
        return;
    }
    for(let [from,to] of macros) {
        if(pos-1>=from.length && value.slice(pos-1-from.length,pos-1)==from) {
            for(let [from2,to2] of macros) {
                if(value.slice(pos-1-from.length,pos) == from2.slice(0,from.length+1)) {
                    return;
                }
            }
            elem.value = value.slice(0,pos-1-from.length)+to+value.slice(pos-1);
            const newpos = pos-from.length+to.length;
            elem.setSelectionRange(newpos,newpos);
        }
    }
}

function simple_match(pattern,result) {
    return function(expr) {
        const m = expr.match(pattern);
        if(m) {
            return [result===undefined ? m[0] : result, expr.slice(m[0].length)];
        }
    }
}

const space = simple_match(/^\s+/,'')
const digit = simple_match(/^\d+/);
const symbol = simple_match(/^(\p{S}|\p{L})/u);
const punctuation = simple_match(/^(?![\\_^])\p{P}/u);

function find_inside(start_pattern,pattern_has_braces = false) {
    return function(expr) {
        const start = expr.match(start_pattern);
        if(!start) {
            return;
        }
        expr = expr.slice(start[0].length);
        const brace = expr.match(/^\{([^\}]*)\}/);
        if(!brace) {
            return;
        }
        const s = start[0]+(pattern_has_braces ? '{' : '');
        let inside = brace[1];
        let out = '';
        while(inside.length) {
            const sp = space(inside);
            if(sp) {
                out += sp[0];
                inside = sp[1];
                continue;
            }
            const r = macros.find(([from,to])=>from.startsWith(s) && (s+inside).startsWith(pattern_has_braces ? from.slice(0,-1) : from) && (!from.startsWith(s+'\\') || inside.slice(from.length-s.length).match(/^(\W|$)/)));
            if(r) {
                out += r[1];
                inside = inside.slice(r[0].length-s.length - (pattern_has_braces ? 1 : 0));
            } else {
                return
            }
        }
        return [out,expr.slice(brace[0].length)];
    }
}

const subsuperscript = find_inside(/^[_^]/);
const mathfont = find_inside(/^\\math[a-z]+/,true);

function replacement(expr) {
    const rep = macros.find(([from,to])=>expr.startsWith(from) && (from.endsWith('}') || !from.startsWith('\\') || expr.slice(from.length).match(/^(\W|\p{P}|$)/u)));
    if(rep) {
        const [from,to] = rep;
        return [to, expr.slice(from.length)];
    }
}

function combiningmark(expr) {
    const mark = combiningmarks.find(([from,to])=>expr.startsWith(from+'{'));
    if(mark) {
        const [from,to] = mark;
        const [inside,rest] = some_tex_to_unicode(expr.slice(from.length+1));
        if(rest.startsWith('}')) {
            const chars = Array.from(inside);
            const mid = Math.ceil(chars.length/2);
            const [a,b] = [chars.slice(0,mid),chars.slice(mid)];
            return [a.join('')+to+b.join(''), rest.slice(1)];
        }
    }
}

export function some_tex_to_unicode(expr) {
    let out = '';
    let braces = 0;
    while(expr.length) {
        if(expr.startsWith('{')) {
            braces += 1;
            expr = expr.slice(1);
            continue;
        } else if(expr.startsWith('}')) {
            braces -= 1;
            if(braces<0) {
                break;
            } else {
                expr = expr.slice(1);
                continue;
            }
        }
        const match = space(expr) || combiningmark(expr) || digit(expr) || subsuperscript(expr) || mathfont(expr) || replacement(expr) || symbol(expr) || punctuation(expr);
        if(match) {
            const [next,nexpr] = match;
            out += next;
            expr = nexpr;
        } else {
            break;
        }
    }
    return [out,expr];
}

export function tex_to_unicode(expr) {
    const [out,nexpr] = some_tex_to_unicode(expr);
    if(!nexpr) {
        return out;
    }
}
