function startAparImport(total) {
  let offset = 0;
  const bar   = jQuery("#apar-progress-bar");
  const text  = jQuery("#apar-progress-text");

  function doChunk() {
    jQuery.post(AparCPT.ajaxurl, {
      action: "apar_cpt_process_chunk",
      nonce: AparCPT.nonce,
      offset: offset
    }, function(res){
      if(!res.success) {
        text.text("Error: " + res.data.msg);
        return;
      }
      offset = res.data.done;
      let percent = Math.round((offset / total) * 100);
      bar.css("width", percent + "%");
      text.text("Imported " + offset + " of " + total);

      if(!res.data.finished) {
        setTimeout(doChunk, 300); // schedule next chunk
      } else {
        text.text("Import complete!");
      }
    });
  }
  doChunk();
}
