function setMetadata({ width, height, format }) {
    const metadataEl = document.getElementById('metadata');
    metadataEl.textContent = `${width} x ${height} | ${format}`;
}

function enableImage() {
    const allImages = document.querySelectorAll('.dds-image');

    const mainImage = document.querySelector('img');
    const selector = document.getElementById('selector');


    allImages.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.dataset.index = index;
    thumb.addEventListener('click', () => {
        mainImage.src = img.src;
        document.querySelectorAll('.selector img').forEach(el => el.classList.remove('active'));
        thumb.classList.add('active');
        idx = index;
    });
    selector.appendChild(thumb);
    });

    if (allImages.length > 0) {
    mainImage.src = allImages[0].src;
    selector.querySelector('img').classList.add('active');
    }

    if (allImages.length === 1) {
    selector.style.display = 'none';
    } else {
    selector.style.display = 'flex';
    }
}

const vscode = acquireVsCodeApi();
document.querySelector('button.download').addEventListener('click', () => {
    vscode.postMessage({ type: "download", index: idx });
});

let idx = 0;
setMetadata(metadata);
enableImage();
