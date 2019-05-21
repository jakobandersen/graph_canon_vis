GraphCanon Visualizer
#####################

This Javascript library is made for visualizing executions of graph canonicalization algorithms
implemented in the `GraphCanon <https://github.com/jakobandersen/graph_canon>`__ library.

The running visualizer can be found `here <https://jakobandersen.github.io/graph_canon_vis>`__.
Use the ``--json <file>`` argument for the ``graph-canon`` executable
(equivalently, use the ``log`` parameter for the debug visitor in the library),
to produce a log-file suitable for the visualizer.


Installation
============

1. Install ``npm`` in whatever way.
2. Install dependencies: ``npm install``
3. Build it using ``npm run build``.
4. The site is now in ``dist/``, which can be served by your favourite method.
   E.g., in Python: ``cd dist/; python3 -m http.server``.
