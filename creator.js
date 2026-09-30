// ========================================
// PORTFOLIO CREATOR
// ========================================


// ----------------------------------------
// MAIN EDIT MODAL
// ----------------------------------------

const editModal = document.getElementById("edit-modal");
const editModalTitle = document.getElementById("edit-modal-title");
const editInputLabel = document.getElementById("edit-input-label");
const editInput = document.getElementById("edit-input");
const editTextarea = document.getElementById("edit-textarea");
const editModalHelp = document.getElementById("edit-modal-help");

const saveButton = document.getElementById("edit-modal-save");
const cancelButton = document.getElementById("edit-modal-cancel");
const closeButton = document.getElementById("edit-modal-close");

let currentEdit = null;
let currentLinkButton = null;


// ----------------------------------------
// STUDENT INFORMATION
// ----------------------------------------

const studentName = document.getElementById("student-name");
const studentTitle = document.getElementById("student-title");
const studentAbout = document.getElementById("student-about");


// Open Name / Title / About editor
document.querySelectorAll("[data-edit]").forEach(function (button) {

    button.addEventListener("click", function () {

        currentEdit = button.dataset.edit;

        // NAME
        if (currentEdit === "name") {

            showInput();

            editModalTitle.textContent = "Edit your name";
            editInputLabel.textContent = "Full Name";
            editInput.value = studentName.textContent.trim();

            editModalHelp.textContent =
                "Enter the name you want displayed on your portfolio.";
        }

        // TITLE / MAJOR
        if (currentEdit === "title") {

            showInput();

            editModalTitle.textContent = "Edit your title";
            editInputLabel.textContent = "Degree, Major, or Title";
            editInput.value = studentTitle.textContent.trim();

            editModalHelp.textContent =
                "Example: Computer Science Student • Cybersecurity";
        }

        // ABOUT ME
        if (currentEdit === "about") {

            showTextarea();

            editModalTitle.textContent = "Edit your About Me";
            editInputLabel.textContent = "About Me";
            editTextarea.value = studentAbout.textContent.trim();

            editModalHelp.textContent =
                "Write a short introduction about your interests, experience, and goals.";
        }

        editModal.classList.add("active");

        if (currentEdit === "about") {
            editTextarea.focus();
        } else {
            editInput.focus();
        }
    });
});


// ----------------------------------------
// RESUME / LINKEDIN / GITHUB
// ----------------------------------------

document.querySelectorAll("[data-link]").forEach(function (button) {

    button.addEventListener("click", function () {

        currentEdit = "link";
        currentLinkButton = button;

        const linkType = button.dataset.link;

        showInput();

        if (linkType === "resume") {
            editModalTitle.textContent = "Add your Resume";
            editInputLabel.textContent = "Resume URL";
            editModalHelp.textContent =
                "Paste a public link to your resume.";
        }

        if (linkType === "linkedin") {
            editModalTitle.textContent = "Add your LinkedIn";
            editInputLabel.textContent = "LinkedIn URL";
            editModalHelp.textContent =
                "Paste the full URL to your LinkedIn profile.";
        }

        if (linkType === "github") {
            editModalTitle.textContent = "Add your GitHub";
            editInputLabel.textContent = "GitHub URL";
            editModalHelp.textContent =
                "Paste the full URL to your GitHub profile.";
        }

        editInput.value = button.dataset.url || "";

        editModal.classList.add("active");
        editInput.focus();
    });
});


// ----------------------------------------
// SAVE MAIN EDIT
// ----------------------------------------

saveButton.addEventListener("click", function () {

    // NAME
    if (currentEdit === "name") {

        const value = editInput.value.trim();

        if (value !== "") {
            studentName.textContent = value;
            updateInitials();
        }
    }


    // TITLE
    if (currentEdit === "title") {

        const value = editInput.value.trim();

        if (value !== "") {
            studentTitle.textContent = value;
        }
    }


    // ABOUT
    if (currentEdit === "about") {

        const value = editTextarea.value.trim();

        if (value !== "") {
            studentAbout.textContent = value;
        }
    }


    // LINKS
    if (currentEdit === "link" && currentLinkButton) {

        const value = editInput.value.trim();

        if (value !== "") {

            currentLinkButton.dataset.url = value;

            const linkType = currentLinkButton.dataset.link;

            if (linkType === "resume") {
                currentLinkButton.textContent = "✓ Resume Added";
            }

            if (linkType === "linkedin") {
                currentLinkButton.textContent = "✓ LinkedIn Added";
            }

            if (linkType === "github") {
                currentLinkButton.textContent = "✓ GitHub Added";
            }
        }
    }

    closeMainModal();
});


// ----------------------------------------
// MODAL HELPERS
// ----------------------------------------

function showInput() {

    editInput.style.display = "block";
    editTextarea.style.display = "none";

    editInput.value = "";
}


function showTextarea() {

    editInput.style.display = "none";
    editTextarea.style.display = "block";

    editTextarea.value = "";
}


function closeMainModal() {

    editModal.classList.remove("active");

    currentEdit = null;
    currentLinkButton = null;
}


cancelButton.addEventListener("click", closeMainModal);
closeButton.addEventListener("click", closeMainModal);


// Close when clicking dark background
editModal.addEventListener("click", function (event) {

    if (event.target === editModal) {
        closeMainModal();
    }
});


// ----------------------------------------
// PROFILE PHOTO
// ----------------------------------------

const photoInput = document.getElementById("photo-input");
const profilePreview = document.getElementById("profile-preview");
const profileInitials = document.getElementById("profile-initials");

photoInput.addEventListener("change", async function () {

    const file = photoInput.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        return;
    }

    try {

        const compressedImage =
            await compressImage(file, 800, 0.72);

        profilePreview.style.backgroundImage =
            `url("${compressedImage}")`;

        profilePreview.style.backgroundSize = "cover";
        profilePreview.style.backgroundPosition = "center";

        profileInitials.style.display = "none";

    } catch (error) {

        alert("The image could not be processed.");
        console.error(error);
    }
});

// Create initials automatically from student's name
function updateInitials() {

    const words = studentName.textContent
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return;
    }

    let initials = words[0][0];

    if (words.length > 1) {
        initials += words[words.length - 1][0];
    }

    profileInitials.textContent = initials.toUpperCase();
}


// ----------------------------------------
// PROJECT EDITOR
// ----------------------------------------

const projectModal = document.getElementById("project-modal");

const projectModalClose =
    document.getElementById("project-modal-close");

const projectModalCancel =
    document.getElementById("project-modal-cancel");

const projectModalSave =
    document.getElementById("project-modal-save");

const projectTitleInput =
    document.getElementById("project-title-input");

const projectDescriptionInput =
    document.getElementById("project-description-input");

const projectLinkInput =
    document.getElementById("project-link-input");

const addProjectButton =
    document.getElementById("add-project-button");

const projectGrid =
    document.getElementById("project-grid");

let currentProject = null;


// ----------------------------------------
// OPEN EXISTING PROJECT
// ----------------------------------------

function connectProjectCard(card) {

    const editButton =
        card.querySelector(".project-edit-button");

    const removeButton =
        card.querySelector(".remove-project-button");


    editButton.addEventListener("click", function () {

        currentProject = card;

        const title =
            card.querySelector(".project-title");

        const description =
            card.querySelector(".project-description");

        const link =
            card.querySelector(".project-link");


        projectTitleInput.value =
            title.textContent.trim();

        projectDescriptionInput.value =
            description.textContent.trim();

        projectLinkInput.value =
            link.dataset.url || "";

        projectModal.classList.add("active");

        projectTitleInput.focus();
    });


    removeButton.addEventListener("click", function () {

        const shouldRemove =
            confirm("Remove this project?");

        if (shouldRemove) {
            card.remove();
        }
    });
}


// Connect the two starting cards
document
    .querySelectorAll(".creator-project-card")
    .forEach(connectProjectCard);


// ----------------------------------------
// SAVE PROJECT
// ----------------------------------------

projectModalSave.addEventListener("click", function () {

    if (!currentProject) {
        return;
    }

    const title =
        projectTitleInput.value.trim();

    const description =
        projectDescriptionInput.value.trim();

    const link =
        projectLinkInput.value.trim();


    if (title !== "") {

        currentProject
            .querySelector(".project-title")
            .textContent = title;
    }


    if (description !== "") {

        currentProject
            .querySelector(".project-description")
            .textContent = description;
    }


    const projectLink =
        currentProject.querySelector(".project-link");


    if (link !== "") {

        projectLink.textContent = "View Project →";
        projectLink.dataset.url = link;

        projectLink.style.cursor = "pointer";
    } else {

        projectLink.textContent = "Project Link";
        delete projectLink.dataset.url;
    }


    closeProjectModal();
});


// Make project link clickable
projectGrid.addEventListener("click", function (event) {

    if (!event.target.classList.contains("project-link")) {
        return;
    }

    const url = event.target.dataset.url;

    if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
    }
});


// ----------------------------------------
// ADD NEW PROJECT
// ----------------------------------------

addProjectButton.addEventListener("click", function () {

    const card = document.createElement("article");

    card.className = "creator-project-card";

    card.innerHTML = `
        <div class="creator-project-placeholder">
            Project Image
        </div>

        <div class="creator-project-content">

            <div class="project-edit-top">

                <h3 class="project-title">
                    New Project
                </h3>

                <button class="edit-button project-edit-button">
                    ✎ Edit
                </button>

            </div>

            <p class="project-description">
                Add a description for your project.
            </p>

            <div class="creator-project-footer">

                <span class="project-link">
                    Project Link
                </span>

                <button class="remove-project-button">
                    Remove
                </button>

            </div>

        </div>
    `;

    projectGrid.appendChild(card);

    connectProjectCard(card);

    // Immediately open editor for new project
    currentProject = card;

    projectTitleInput.value = "";
    projectDescriptionInput.value = "";
    projectLinkInput.value = "";

    projectModal.classList.add("active");

    projectTitleInput.focus();
});


// ----------------------------------------
// CLOSE PROJECT MODAL
// ----------------------------------------

function closeProjectModal() {

    projectModal.classList.remove("active");

    currentProject = null;
}


projectModalClose.addEventListener(
    "click",
    closeProjectModal
);

projectModalCancel.addEventListener(
    "click",
    closeProjectModal
);


projectModal.addEventListener("click", function (event) {

    if (event.target === projectModal) {
        closeProjectModal();
    }
});


// ----------------------------------------
// ESC KEY
// ----------------------------------------

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        closeMainModal();
        closeProjectModal();
    }
});
// ----------------------------------------
// PROJECT IMAGE UPLOAD
// ----------------------------------------

function enableProjectImageUpload(card) {

    const imageArea =
        card.querySelector(".creator-project-placeholder");

    // Prevent adding the input twice
    if (imageArea.querySelector(".project-image-input")) {
        return;
    }

    imageArea.classList.add("project-image-upload");

    // Upload overlay
    const overlay = document.createElement("div");
    overlay.className = "project-image-overlay";
    overlay.innerHTML = `
        <span>📷</span>
        <strong>Change Project Image</strong>
        <small>JPG or PNG</small>
    `;

    // Hidden file input
    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.accept = "image/png, image/jpeg, image/webp";
    fileInput.className = "project-image-input";
    fileInput.hidden = true;

    imageArea.appendChild(overlay);
    imageArea.appendChild(fileInput);


    // Click image area
    imageArea.addEventListener("click", function () {
        fileInput.click();
    });


    // Image selected
    fileInput.addEventListener("change", async function () {

    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        return;
    }

    try {

        const compressedImage =
            await compressImage(file, 1000, 0.70);

        imageArea.style.backgroundImage =
            `url("${compressedImage}")`;

        imageArea.style.backgroundSize = "cover";
        imageArea.style.backgroundPosition = "center";
        imageArea.style.backgroundRepeat = "no-repeat";

        Array.from(imageArea.childNodes).forEach(function (node) {

            if (
                node.nodeType === Node.TEXT_NODE &&
                node.textContent.trim() === "Project Image"
            ) {
                node.textContent = "";
            }

        });

        imageArea.classList.add("has-project-image");

    } catch (error) {

        alert("The project image could not be processed.");
        console.error(error);
    }
});
}


// Enable upload on existing project cards
document
    .querySelectorAll(".creator-project-card")
    .forEach(enableProjectImageUpload);


// Also enable it automatically for newly added projects
const projectImageObserver = new MutationObserver(function (mutations) {

    mutations.forEach(function (mutation) {

        mutation.addedNodes.forEach(function (node) {

            if (
                node.nodeType === 1 &&
                node.classList.contains("creator-project-card")
            ) {
                enableProjectImageUpload(node);
            }

        });

    });

});


projectImageObserver.observe(projectGrid, {
    childList: true
});
// ========================================
// SAVE PORTFOLIO
// ========================================

const savePortfolioButton =
    document.getElementById("save-portfolio-button");

const editingStatus =
    document.querySelector(".editing-status");


// SAVE
savePortfolioButton.addEventListener("click", function () {

    const projects = [];

    document
        .querySelectorAll(".creator-project-card")
        .forEach(function (card) {

            const imageArea =
                card.querySelector(".creator-project-placeholder");

            projects.push({

                title:
                    card.querySelector(".project-title")
                        .textContent.trim(),

                description:
                    card.querySelector(".project-description")
                        .textContent.trim(),

                link:
                    card.querySelector(".project-link")
                        .dataset.url || "",

                image:
                    imageArea.style.backgroundImage || ""

            });

        });


    const portfolioData = {

        name:
            studentName.textContent.trim(),

        title:
            studentTitle.textContent.trim(),

        about:
            studentAbout.textContent.trim(),

        resume:
            document.querySelector('[data-link="resume"]')
                .dataset.url || "",

        linkedin:
            document.querySelector('[data-link="linkedin"]')
                .dataset.url || "",

        github:
            document.querySelector('[data-link="github"]')
                .dataset.url || "",

        profileImage:
            profilePreview.style.backgroundImage || "",

        projects: projects
    };


    try {

        localStorage.setItem(
            "portfolioCreatorData",
            JSON.stringify(portfolioData)
        );

        showSavedStatus();

    } catch (error) {

        alert(
            "Your portfolio could not be saved. Try using smaller images."
        );

        console.error(error);
    }

});


// ----------------------------------------
// SAVED STATUS
// ----------------------------------------

function showSavedStatus() {

    editingStatus.innerHTML = `
        <span class="status-dot"></span>
        Portfolio Saved
    `;

    savePortfolioButton.textContent = "✓ Saved";

    setTimeout(function () {

        editingStatus.innerHTML = `
            <span class="status-dot"></span>
            Editing Your Portfolio
        `;

        savePortfolioButton.textContent = "💾 Save";

    }, 2500);
}
// ========================================
// LOAD SAVED PORTFOLIO
// ========================================

function loadSavedPortfolio() {

    const savedData =
        localStorage.getItem("portfolioCreatorData");

    if (!savedData) {
        return;
    }

    try {

        const data = JSON.parse(savedData);


        // BASIC INFORMATION
        if (data.name) {
            studentName.textContent = data.name;
        }

        if (data.title) {
            studentTitle.textContent = data.title;
        }

        if (data.about) {
            studentAbout.textContent = data.about;
        }


        // LINKS
        const resumeButton =
            document.querySelector('[data-link="resume"]');

        const linkedinButton =
            document.querySelector('[data-link="linkedin"]');

        const githubButton =
            document.querySelector('[data-link="github"]');


        if (data.resume) {
            resumeButton.dataset.url = data.resume;
            resumeButton.textContent = "✓ Resume Added";
        }

        if (data.linkedin) {
            linkedinButton.dataset.url = data.linkedin;
            linkedinButton.textContent = "✓ LinkedIn Added";
        }

        if (data.github) {
            githubButton.dataset.url = data.github;
            githubButton.textContent = "✓ GitHub Added";
        }


        // PROFILE IMAGE
        if (data.profileImage) {

            profilePreview.style.backgroundImage =
                data.profileImage;

            profilePreview.style.backgroundSize = "cover";
            profilePreview.style.backgroundPosition = "center";

            profileInitials.style.display = "none";

        } else {

            updateInitials();
        }


        // PROJECTS
        if (
            Array.isArray(data.projects) &&
            data.projects.length > 0
        ) {

            projectGrid.innerHTML = "";


            data.projects.forEach(function (project) {

                const card =
                    document.createElement("article");

                card.className =
                    "creator-project-card";


                card.innerHTML = `
                    <div class="creator-project-placeholder">
                        Project Image
                    </div>

                    <div class="creator-project-content">

                        <div class="project-edit-top">

                            <h3 class="project-title"></h3>

                            <button
                                class="edit-button project-edit-button">
                                ✎ Edit
                            </button>

                        </div>

                        <p class="project-description"></p>

                        <div class="creator-project-footer">

                            <span class="project-link">
                                Project Link
                            </span>

                            <button class="remove-project-button">
                                Remove
                            </button>

                        </div>

                    </div>
                `;


                card.querySelector(".project-title")
                    .textContent =
                    project.title || "Project Title";


                card.querySelector(".project-description")
                    .textContent =
                    project.description || "";


                const projectLink =
                    card.querySelector(".project-link");


                if (project.link) {

                    projectLink.textContent =
                        "View Project →";

                    projectLink.dataset.url =
                        project.link;

                    projectLink.style.cursor =
                        "pointer";
                }


                const imageArea =
                    card.querySelector(
                        ".creator-project-placeholder"
                    );


                if (project.image) {

                    imageArea.style.backgroundImage =
                        project.image;

                    imageArea.style.backgroundSize =
                        "cover";

                    imageArea.style.backgroundPosition =
                        "center";

                    imageArea.textContent = "";
                }


                projectGrid.appendChild(card);

                connectProjectCard(card);
                enableProjectImageUpload(card);

            });

        }


    } catch (error) {

        console.error(
            "Saved portfolio could not be loaded:",
            error
        );
    }
}


// Load automatically when page opens
loadSavedPortfolio();
// ========================================
// IMAGE COMPRESSION
// ========================================

function compressImage(file, maxWidth = 1200, quality = 0.75) {

    return new Promise(function (resolve, reject) {

        const reader = new FileReader();

        reader.onload = function (event) {

            const img = new Image();

            img.onload = function () {

                let width = img.width;
                let height = img.height;

                // Resize while keeping aspect ratio
                if (width > maxWidth) {

                    height = Math.round(
                        height * (maxWidth / width)
                    );

                    width = maxWidth;
                }

                const canvas =
                    document.createElement("canvas");

                canvas.width = width;
                canvas.height = height;

                const ctx =
                    canvas.getContext("2d");

                ctx.drawImage(
                    img,
                    0,
                    0,
                    width,
                    height
                );

                // Convert to compressed JPEG
                const compressedImage =
                    canvas.toDataURL(
                        "image/jpeg",
                        quality
                    );

                resolve(compressedImage);
            };

            img.onerror = reject;

            img.src = event.target.result;
        };

        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}
// ========================================
// PREVIEW MODE
// ========================================

const previewButton =
    document.querySelector(".preview-button");

let previewMode = false;


previewButton.addEventListener("click", function () {

    previewMode = !previewMode;

    document.body.classList.toggle(
        "preview-mode",
        previewMode
    );

    if (previewMode) {

        previewButton.textContent = "← Back to Editor";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } else {

        previewButton.textContent = "👁 Preview";
    }
});
// ========================================
// EXPORT PORTFOLIO
// ========================================

const exportButton =
    document.querySelector(".export-button");


exportButton.addEventListener("click", function () {

    const name =
        studentName.textContent.trim();

    const title =
        studentTitle.textContent.trim();

    const about =
        studentAbout.textContent.trim();

    const resume =
        document.querySelector('[data-link="resume"]')
            .dataset.url || "";

    const linkedin =
        document.querySelector('[data-link="linkedin"]')
            .dataset.url || "";

    const github =
        document.querySelector('[data-link="github"]')
            .dataset.url || "";


    // PROFILE IMAGE
    const profileImage =
        extractBackgroundImage(
            profilePreview.style.backgroundImage
        );


    // PROJECTS
    let projectsHTML = "";

    document
        .querySelectorAll(".creator-project-card")
        .forEach(function (card) {

            const projectTitle =
                card.querySelector(".project-title")
                    .textContent.trim();

            const projectDescription =
                card.querySelector(".project-description")
                    .textContent.trim();

            const projectLink =
                card.querySelector(".project-link")
                    .dataset.url || "";

            const imageArea =
                card.querySelector(
                    ".creator-project-placeholder"
                );

            const projectImage =
                extractBackgroundImage(
                    imageArea.style.backgroundImage
                );


            projectsHTML += `
                <article class="project-card">

                    ${
                        projectImage
                        ? `
                        <img
                            src="${projectImage}"
                            class="project-image"
                            alt="${escapeHTML(projectTitle)}">
                        `
                        : `
                        <div class="project-placeholder">
                            Project Image
                        </div>
                        `
                    }

                    <div class="project-content">

                        <h3>
                            ${escapeHTML(projectTitle)}
                        </h3>

                        <p>
                            ${escapeHTML(projectDescription)}
                        </p>

                        ${
                            projectLink
                            ? `
                            <a
                                href="${escapeHTML(projectLink)}"
                                target="_blank"
                                rel="noopener noreferrer">
                                View Project →
                            </a>
                            `
                            : ""
                        }

                    </div>

                </article>
            `;
        });


    // SOCIAL LINKS
    let linksHTML = "";

    if (resume) {
        linksHTML += `
            <a
                href="${escapeHTML(resume)}"
                target="_blank"
                rel="noopener noreferrer">
                Resume
            </a>
        `;
    }

    if (linkedin) {
        linksHTML += `
            <a
                href="${escapeHTML(linkedin)}"
                target="_blank"
                rel="noopener noreferrer">
                LinkedIn
            </a>
        `;
    }

    if (github) {
        linksHTML += `
            <a
                href="${escapeHTML(github)}"
                target="_blank"
                rel="noopener noreferrer">
                GitHub
            </a>
        `;
    }


    // INITIALS
    const initials =
        createExportInitials(name);


    // FINAL WEBSITE
    const exportedHTML = `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0">

<title>${escapeHTML(name)} | Portfolio</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family:
        Inter,
        Arial,
        Helvetica,
        sans-serif;

    color: #0f172a;
    background: #ffffff;
}

.container {
    width: min(1100px, 88%);
    margin: auto;
}


/* HERO */

.hero {
    padding: 90px 0;
    background:
        linear-gradient(
            120deg,
            #ffffff 55%,
            #eef4ff 100%
        );
}

.hero-grid {
    display: grid;
    grid-template-columns: 1.6fr 0.7fr;
    gap: 70px;
    align-items: center;
}

h1 {
    margin: 0 0 10px;

    font-size: clamp(48px, 7vw, 72px);
    letter-spacing: -3px;
}

.title {
    margin-bottom: 38px;

    color: #475569;
    font-size: 21px;
    font-weight: 700;
}

.about-box {
    max-width: 700px;
}

.about-box h2 {
    margin-bottom: 12px;
    font-size: 18px;
}

.about-box p {
    margin: 0;

    color: #64748b;
    line-height: 1.8;
}

.links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;

    margin-top: 30px;
}

.links a {
    padding: 11px 18px;

    border: 1px solid #cbd5e1;
    border-radius: 8px;

    color: #2563eb;
    text-decoration: none;
    font-weight: 700;
}

.links a:hover {
    background: #eff6ff;
}


/* PROFILE */

.profile-wrap {
    display: flex;
    justify-content: center;
}

.profile-image,
.profile-initials {
    width: 210px;
    height: 210px;

    border-radius: 50%;

    border: 7px solid white;

    box-shadow:
        0 20px 50px rgba(15, 23, 42, 0.12);
}

.profile-image {
    object-fit: cover;
}

.profile-initials {
    display: flex;
    align-items: center;
    justify-content: center;

    background: #dbeafe;

    color: #2563eb;

    font-size: 48px;
    font-weight: 800;
}


/* PROJECTS */

.projects {
    padding: 80px 0;

    background: #f8fafc;
}

.section-label {
    margin: 0 0 12px;

    color: #2563eb;

    font-size: 12px;
    font-weight: 800;
    letter-spacing: 2px;
}

.projects h2 {
    margin: 0 0 10px;

    font-size: 38px;
}

.section-description {
    margin: 0 0 35px;

    color: #64748b;
}

.project-grid {
    display: grid;

    grid-template-columns:
        repeat(2, minmax(0, 1fr));

    gap: 24px;
}

.project-card {
    overflow: hidden;

    border: 1px solid #e2e8f0;
    border-radius: 14px;

    background: white;
}

.project-image,
.project-placeholder {
    width: 100%;
    height: 240px;
}

.project-image {
    display: block;

    object-fit: cover;
}

.project-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;

    background:
        linear-gradient(
            135deg,
            #1e3a8a,
            #2563eb
        );

    color: white;

    font-weight: 700;
}

.project-content {
    padding: 24px;
}

.project-content h3 {
    margin: 0 0 12px;

    font-size: 21px;
}

.project-content p {
    min-height: 55px;

    color: #64748b;
    line-height: 1.7;
}

.project-content a {
    display: inline-block;

    margin-top: 12px;

    color: #2563eb;

    font-weight: 800;
    text-decoration: none;
}


/* FOOTER */

footer {
    padding: 28px;

    border-top: 1px solid #e2e8f0;

    text-align: center;

    color: #94a3b8;

    font-size: 13px;
}


/* MOBILE */

@media (max-width: 750px) {

    .hero {
        padding: 60px 0;
    }

    .hero-grid {
        grid-template-columns: 1fr;
    }

    .profile-wrap {
        order: -1;
    }

    .project-grid {
        grid-template-columns: 1fr;
    }

    h1 {
        letter-spacing: -2px;
    }
}

</style>

</head>


<body>


<section class="hero">

    <div class="container hero-grid">

        <div>

            <h1>
                ${escapeHTML(name)}
            </h1>

            <div class="title">
                ${escapeHTML(title)}
            </div>


            <div class="about-box">

                <h2>About Me</h2>

                <p>
                    ${escapeHTML(about)}
                </p>

            </div>


            ${
                linksHTML
                ? `
                <div class="links">
                    ${linksHTML}
                </div>
                `
                : ""
            }

        </div>


        <div class="profile-wrap">

            ${
                profileImage
                ? `
                <img
                    src="${profileImage}"
                    class="profile-image"
                    alt="${escapeHTML(name)}">
                `
                : `
                <div class="profile-initials">
                    ${escapeHTML(initials)}
                </div>
                `
            }

        </div>

    </div>

</section>


<section class="projects">

    <div class="container">

        <p class="section-label">
            YOUR WORK
        </p>

        <h2>
            My Projects
        </h2>

        <p class="section-description">
            Selected academic, professional, and personal projects.
        </p>


        <div class="project-grid">
            ${projectsHTML}
        </div>

    </div>

</section>


<footer>
    Portfolio of ${escapeHTML(name)}
</footer>


</body>

</html>
`;


    // DOWNLOAD FILE
    const blob =
        new Blob(
            [exportedHTML],
            {
                type: "text/html"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const downloadLink =
        document.createElement("a");

    downloadLink.href = url;

    downloadLink.download =
        "index.html";


    document.body.appendChild(
        downloadLink
    );

    downloadLink.click();

    downloadLink.remove();


    URL.revokeObjectURL(url);

});


// ----------------------------------------
// EXPORT HELPERS
// ----------------------------------------

function extractBackgroundImage(value) {

    if (!value || value === "none") {
        return "";
    }

    return value
        .replace(/^url\(["']?/, "")
        .replace(/["']?\)$/, "");
}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function createExportInitials(name) {

    const words =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (words.length === 0) {
        return "YN";
    }

    let initials =
        words[0][0];

    if (words.length > 1) {

        initials +=
            words[words.length - 1][0];
    }

    return initials.toUpperCase();
}