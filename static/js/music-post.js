$(document).ready(function(){
  $(".music-vextab").each (function(index, item){
    content = $(item).text();
    var canvas = document.createElement('canvas');
    console.log(content);
    renderer = new Vex.Flow.Renderer( canvas,
                  Vex.Flow.Renderer.Backends.CANVAS);
    artist = new Vex.Flow.Artist(10, 10, 600, {scale: 0.8});
    vextab = new Vex.Flow.VexTab(artist);
    try {
          vextab.reset();
          artist.reset();
          vextab.parse(content);
          artist.render(renderer);
        } catch (e) {
          console.log(e);
        }
    $(item).replaceWith(canvas);
  });

  $(".music-chord").each(function(index, item){
    console.log(item);
    var key = $(item).data("key");
    var shape = $(item).data("shape");
    var string = $(item).data("str");
    var elem = createChordElement(createChordStruct(key, string, shape));
    $(item).replaceWith(elem);
  });
});
