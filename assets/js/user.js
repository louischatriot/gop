var ctrlDown = false;
var $ghostLink = $('<a href="http://google.fr" target="_blank" id="ghost-link" style="display: none;">Ghost link</a>')

$('tr').on('mousedown', function (evt) {
  var url = $(evt.currentTarget).attr('href');
  if (!url || url.length === 0) { return; }
  if (evt.which === 1) {
    if (ctrlDown) {
      openInNewTab(url);
      ctrlDown = false;
    } else {
      openInCurrentTab(url);
    }
  }
  if (evt.which === 2) { openInNewTab(url); }
});

$(document).on('keydown', function (evt) {
  if (evt.keyCode === 17) { ctrlDown = true; }
});

$(document).on('keyup', function (evt) {
  if (evt.keyCode === 17) { ctrlDown = false; }
});

function openInCurrentTab (url) {
  document.location = url;
}

function openInNewTab (url) {
  $ghostLink.attr('href', url);
  $ghostLink[0].click();
}

