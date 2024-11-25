---
layout: default
title: Making the Site
plots: making-the-site
mathjax: True
type: article
---


# Making the Site: _Adventures in static sites_
_March 24, 2024_
<hr>

**Table of Contents**

[TOC]

### Intro

After many attempts at using [Jekyll](https://jekyllrb.com/) to build a static site for GitHub pages, I finally decided to roll my own static site builder. Jekyll works well out of the box, but trying to configure it to my needs was difficult. At times the documentation feels terse, at others, overly verbose.

Additionally, trying to build a site from scratch is an absolute pain. I can handle HTML, JavaScript and some CSS. But, once you get into Responsive Web Design and more elaborate thing with CSS, problems can escalate quickly.

__Solution__: Use a base CSS file and modify to my needs + Python to build the generation pipeline.

My 'pipeline' is very similar to the way Jekyll works. Write content in markdown with some front matter and use HTML templates
and a template engine to inject the content.

### The Code  

My python back-end builder consists of:

- [jinja2](https://jinja.palletsprojects.com/en/3.1.x/) for templates
- [Python Frontmatter](https://pypi.org/project/python-frontmatter/) to parse markdown front-matter and content
- [Python-Markdown](https://pypi.org/project/Markdown/) to render the markdown to HTML  
  - [MarkupSafe](https://pypi.org/project/MarkupSafe/) for escaping HTML in the markdown files, allowing it to be correctly rendered

My 'front-end' is handled by:

- A base CSS file from the github-pages theme [slate](https://github.com/pages-themes/slate). This styling is pleasing to me and is has very few CSS rule, so its easy to modify.

And JavaScript to:

  - dynamically highlight code with [Highlights.js](https://highlightjs.org/)
  - insert [Plotly](https://plotly.com/python/) graphs, which I create in Python.  

and that is it. Here is my Python code to render/build the static site

<details open>
<summary>Click to Hide/Show Code</summary>

```python
from pathlib import Path
import shutil

import frontmatter
import markdown
from markdown.extensions.toc import TocExtension
from markupsafe import Markup
from jinja2 import Environment, FileSystemLoader, select_autoescape

def make_html(page, out_path):
     # 1) Load <page>.md and parse yaml and content
    post = frontmatter.load(page)
    metadata = post.metadata
    content = post.content

    # 2) Convert content to HTML
    content = markdown.markdown(
        content,
        extensions=[
            'fenced_code',
            TocExtension(toc_depth="2-6", permalink=True)
        ]
    )
    html = Markup(content) # make safe

    # 3) Write to out_file
    name = page.with_suffix('.html').name
    out_file = Path(f"{out_path}/{name}")

    with open(out_file, "w", encoding="utf-8") as f:
        template = env.get_template(f"{metadata['layout']}.html")
        f.write(template.render(content=html, page=metadata))

# --------------
BUILD = Path("./_site")
ASSETS = BUILD.joinpath("assets")
POSTS = BUILD.joinpath("posts")
PAGES = BUILD.joinpath("pages")

# ---------------
# Setup jinja environment
env = Environment(
    loader=FileSystemLoader("_templates"),
    autoescape=select_autoescape()
)

# ---------------
# Remove DIRS
if not BUILD.exists():
    BUILD.mkdir()
else:
    for file_ in BUILD.glob("*.html"):
        file_.unlink()

    if ASSETS.exists():
        shutil.rmtree(ASSETS)
    if POSTS.exists():
        shutil.rmtree(POSTS)

# remake/copy
POSTS.mkdir()
shutil.copytree(Path("./posts/resources"), POSTS.joinpath("resources"))
shutil.copytree(Path("./assets"), ASSETS)

# -------------
# Loop over pages and build HTML
for page in Path("./pages").glob("*.md"):
    make_html(page, out_path=BUILD)

for post in Path("./posts").glob("*.md"):
    make_html(post, out_path=POSTS)
```
</details>

<br>

Really simple. Remove directories as needed and remake them, copy all the assets, then loop over the markdown files rendering them to HTML and writing to the `_site` directory.

This is the rough structure of the main directory:

```plaintext
.
|- assets/
|  |- css/
|  |  |- style.css
|  |- js/
|     |- script.js
|- pages/
|  |- index.md
|  |- page.md
|- posts/
|  |- post1.md
|- _site/
|  |- assets/  
|  |- posts/
|  |- index.html
|- _templates/
|  |- includes/
|  |  |- header.html
|  |- default.html
|  |- posts.html
|- build.py
|- serve.sh
```
<br>

`build.py` is the above code and `serve.sh` is a simple script to run Pythons `http.server` and serve the `_site` directory so I can build and view the site locally.

__serve.sh__

```bash
#!/bin/bash
python -m http.server 8000 --bind 127.0.0.1 --directory ./_site
```
<hr>
<br>

### Adding Plotly Graphs

With some JavaScript in one of HTML templates, we can easily include an interactive plot.

```html
<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
<script>
  async function makePlots() {
    const response = await fetch("/posts/resources/{{ page.plots }}/plots.json");
    let plt_names = await response.json();

    for (let [divID, file] of Object.entries(plt_names)) {
      const response = await fetch("/posts/resources/{{ page.plots }}/"+file);
      let plotly_data = await response.json();
      let ele = document.getElementById(divID);
      var config = {responsive: true}
      Plotly.react(ele, plotly_data.data, plotly_data.layout, config);
    }
  }
</script>
```

First we make the plot in Python and write it to JSON.

```python
import plotly.graph_objects as go
import plotly.express as px

fig = go.Figure(
    data=[go.Bar(x=[1, 2, 3], y=[1, 3, 2])],
    layout=go.Layout(height=600, width=800)
)

data_canada = px.data.gapminder().query("country == 'Canada'")
fig = px.bar(data_canada, x='year', y='pop')

fig.write_json("figure1.json")
```

<br>

Then the above JavaScript is used to load Plotly, fetch a JSON file named __plots.json__ which contains:

```json
{"plotly-fig1": "figure1.json"}
```

where the _div_ id is the key and the name of the JSON file is its value. We then loop over __plots.json__ to fetch and load each plot and build the responsive graphs.

To control placement of graphs, we add this HTML element to our markdown file for each figure:

```html
<div id='plotly-fig1'></div>
<div id='plotly-fig2'></div>
.
.
.
<div id='plotly-figN'></div>
```

Here is a basic graph.

(Requires JavaScript, so unblock this site or enable JavaScript if needed)


<div id='plotly-fig1'></div>

<hr>
<br>

### Extras

With this setup, I can easily add more bells and whistles, for example:

- Use [MathJax](https://www.mathjax.org/) to render equations
- Use [emgithub](https://github.com/yusanshi/emgithub) to embed markdown, code, or Jupyter notebooks.
- Anything else that comes up

Here is an example of using __emgithub__ to embed some code from one of my games:

<script src="https://emgithub.com/embed-v2.js?target=https%3A%2F%2Fgithub.com%2Fsitaber%2Fmissile-mayhem%2Fblob%2Fmain%2Fapp%2Fenemy.py&style=atom-one-dark&type=code&showBorder=on&showLineNumbers=on&showFileMeta=on&showFullPath=on&showCopy=on"></script>


### The End!

That's it for my first post, thanks for reading!
