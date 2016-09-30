'use strict';
var dust = require('dustjs-helpers');

// Picture helper,
// path is assumed to be picture in the current context
// {@picture [ path="photo", width="150" height="150" crop="fill" ] /}
dust.helpers.picture = function (chunk, ctx, bodies, params) {
    params = params || {};

    ctx = params.path ? ctx.get(params.path) : ctx.current();

    if (ctx.picture)
        ctx = ctx.picture;

    if (!ctx || !ctx.url)
        return chunk;


    var filepicker_url = ctx.url;
    var sizeparams = [];
    if (params.width) sizeparams.push('w=' + params.width);
    if (params.height) sizeparams.push('h=' + params.height);
    if (params.fit) sizeparams.push('fit=' + params.fit);
    if (params.align) sizeparams.push('align=' + params.align);
    if (sizeparams.length) filepicker_url = filepicker_url + '/convert?' + sizeparams.join('&');
    return chunk.write(filepicker_url);
};

// Truncates a string. from can be 'right', 'left', or 'middle'.
// If the string is shorter than length, ellipsis will not be added.
dust.helpers.truncate = function (chunk, context, bodies, params) {
    var options = {
        length: 20,
        from: 'right',
        ellipsis: '...'
    };

    Object.merge(options, params);

    return chunk.tap(function (data) {
        return data.truncate(options.length, options.from, options.ellipsis);
    }).render(bodies.block, context).untap();
};

// Strips all HTML tags from the string.
// Tags to strip may be enumerated in the parameters, otherwise will strip all.
// example:
//  {@stripTags tags="p,br"}
//      <p>this is some<br>text</p>
//      <p><a href="http://site.com">with</><br> a link</p>
//  {/stripTags}
// result:
//  this is some text <a href="http://site.com">with</a> a link
dust.helpers.stripTags = function (chunk, context, bodies, params) {
    var tags = params.tags || '';

    return chunk.tap(function (data) {
        return data.stripTags(tags);
    }).render(bodies.block, context).untap();
};

// Paging helper to use with Content helper
// example:
//  {@paging [display="number of pages to display"]}
//  <ul>
//      {?previous}
//      <li> <a href="?{query}={previous}" title=""> Prev </a> </li>
//      {/previous}
//      {#range}
//      {@eq key="{current}" value="{.}" type="number"}
//      <li> {.} </li>
//      {:else}
//      <li> <a href="?{query}={.}" title=""> {.} </a> </li>
//      {/eq}
//      {/range}
//      {?next}
//      <li> <a href="?{query}={next}" title=""> Next </a> </li>
//      {/next}
//  </ul>
//  {/paging}
/* TODO:
{@paginate}
    {#prev}<a href="{link}">prev</a>{/prev}
    {#next}<a href="{link}">next</a>{/next}
    <ul>
    {#pages}
        {#current}
            <span>{num}</span>
        {:else}
            <a href="{link}">{num}</a>
        {/current}

        <a href="{link}" {#current}class="active"{/current}>{num}</a>
    {/pages}
    </ul>
{/paginate}
 */
dust.helpers.paging = function(chunk, context, bodies, params){
    // TODO: it's ugly now

    params = params || {};
    var page = context.get('page');

    var count = context.get('count');
    var display = params.display || 5;
    var records = context.get('records');
    var current = page.query.page && Math.abs(Number(page.query.page)) || 1;
    var start, end, pages;
    var old_display = (display % 2 === 0) ? 1 : 0, i, half;
    var result = {
        query : params.query || 'page',
        current : current,
        previous : null,
        next : null,
        first : null,
        last : null,
        range : [],
        from : null,
        to : null,
        total : count,
        pages : null
    };
    /* zero division; negative */
    if(records <= 0) {
        return chunk.render(bodies.block, context.push(result));
    }
    pages = (count / records).ceil();
    result.pages = pages;
    if(pages < 2) {
        result.from = 1;
        result.to = count;
        return chunk.render(bodies.block, context.push(result));
    }

    if(current > pages) {
        current = pages;
        result.current = current;
    }
    half = (display / 2).floor();
    start = current - half;
    end = current + half - old_display;

    if(start < 1) {
        start = 1;
        end = start + display;
        if(end > pages) {
            end = pages;
        }
    }

    if(end > pages) {
        end = pages;
        start = end - display + 1;
        if(start < 1) {
            start = 1;
        }
    }

    for( i = start; i <= end; i++) {
        result.range.push(i);
    }

    if(current > 1) {
        result.first = 1;
        result.previous = current - 1;
    }

    if(current < pages) {
        result.last = pages;
        result.next = current + 1;
    }

    result.from = (current - 1) * records + 1;
    if(current == pages) {
        result.to = count;
    } else {
        result.to = result.from + records - 1;
    }

    result.link = page.url + "?" + result.query + "=";

    return chunk.render(bodies.block, context.push(result));
};
