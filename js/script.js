const video = document.getElementById('back');
const main_inner = document.getElementById('main_inner');
// 영상 재생이 끝났을 때 이벤트 발생
video.addEventListener('ended', () => {
  main_inner.classList.add('active');
});



const gnb_swiper = new Swiper('#gnb', {
  wrapperClass:"menu", //슬라이드를 감싸는 영역의 클래스
  slideClass:"btn", //각 슬라이드영역의 클래스
  slidesPerView:"auto", //버튼의 갯수만큼 설정
});

const wrap_swiper = new Swiper('#wrap', {
  wrapperClass:"container", //슬라이드를 감싸는 영역의 클래스
  slideClass:"section", //각 슬라이드영역의 클래스
  direction: "vertical",
  speed: 600,
  thumbs:{
    swiper:gnb_swiper,
    slideThumbActiveClass:"active",
  },
  navigation: {
    nextEl: ".next",
    prevEl: ".prev"
  },
  pagination: {
    el: ".pager",
    clickable: true,
    bulletActiveClass:'active',
  },
  mousewheel: true
});


const works_swiper = new Swiper('#works_inner', {
  wrapperClass:"list", //슬라이드를 감싸는 영역의 클래스
  slideClass:"item", //각 슬라이드영역의 클래스
  slidesPerView: "auto",
  spaceBetween: 80,
  speed: 900,
  nested:true, //내부 swiper에게 설정

  // [3] 마우스 휠 최적화
  mousewheel: {
    enabled: true,
    //forceToAxis: true,    // 가로 휠과 상하 풀페이지 스크롤 간섭 방지
    sensitivity: 0.8,     // 휠 한 번에 훅 넘어가지 않도록 감도 조절 (기본값 1보다 약간 낮게)
    releaseOnEdges: true, // 첫 슬라이드나 끝 슬라이드 도달 시 상/하 풀페이지로 휠 전달
  },

});




Fancybox.bind("[data-fancybox]", {
  // 옵션 (필요 시)
});