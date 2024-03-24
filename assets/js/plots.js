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
