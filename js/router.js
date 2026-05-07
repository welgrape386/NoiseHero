import { TabBar } from "../components/tabbar.js";

const routes = {
  home: "/pages/home.html",
  measure: "/pages/measure.html",
  report: "/pages/report.html",
  chatbot: "/pages/chatbot.html",
  mypage: "/pages/mypage.html",
};

export async function navigate(page) {
  const res = await fetch(routes[page]);
  const html = await res.text();

  document.getElementById("app").innerHTML = html + TabBar();

  setActiveTab(page);

  if (page === "measure") {
    startNoise();
  }
}

function setActiveTab(page) {
  setTimeout(() => {
    document.querySelectorAll(".tab-item").forEach(tab => {
      tab.classList.remove("active");
    });

    document.getElementById(`tab-${page}`)?.classList.add("active");
  }, 0);
}

window.navigate = navigate;

// 초기 실행
navigate("home");