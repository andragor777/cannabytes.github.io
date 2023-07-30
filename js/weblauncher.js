let socket; // Declare the socket variable in the global scope
let isConnect = false;
let serverID;
let chronicle;
let domain;
let l2exe;
let args;
let listPatch;
let storage;
let enabledLauncher;
let isUpdateClient = false;
HtmlAddProgressBar()

async function loadJsonFile() {
    try {
        const response = await fetch('data/server.json');
        const data = await response.json();
        serverID = data.id;
        chronicle = data.chronicle;
        domain = data.domain;
        l2exe = data.l2exe;
        args = data.args;
        listPatch = data.list;
        storage = data.storage;
        enabledLauncher = data.enabled;

        $(".chronicle").text(chronicle)
        $(".rateExp").text("x" + data.rateExp)

        $(".registrationLink").attr("href", data.registrationLink)
        $(".descriptionLink").attr("href", data.descriptionLink)
        $(".forumLink").attr("href", data.forumLink)


        var url = document.createElement('a');
        url.href = domain;
        $(".mainDomain").text(url.hostname);

        $('title').text('Лаунчер '+url.hostname+ ' ' +chronicle);

    } catch (error) {
        console.error('Ошибка при чтении JSON-файла:', error);
    }
}

// Call the async function to load the JSON file
loadJsonFile().then(() => {
    // The JSON file has been loaded and the variables have been set.
    // Now you can proceed with the rest of your code that depends on these variables.
    initWebSocket();
});


// Создаем функцию для инициализации соединения с сервером
function initWebSocket() {
    // Указываем адрес сервера и порт, к которому будет происходить подключение
    const serverUrl = 'ws://localhost:17580/ws'; // Замените на свой сервер, если нужно

    // Создаем новый экземпляр WebSocket
    socket = new WebSocket(serverUrl); // Remove 'const' here

    // Функция для установки соединения
    function connect() {
        socket = new WebSocket(serverUrl);
        socket.onopen = () => {
            console.log('Соединение установлено');
            isConnect = true;
            isConnected();
            firstRequest()
        };

        socket.onmessage = (event) => {
            responseMessage(event)
        };

        socket.onclose = (event) => {
            console.log('Соединение закрыто', event);
            isDisnnected();
            // При разрыве соединения, вызываем функцию для повторной попытки соединения через 1 секунду
            setTimeout(connect, 1000);
        };

        socket.onerror = (error) => {
            console.error('Ошибка веб-сокета:', error);
        };
    }

    // Запускаем процесс установки соединения
    connect();

    // Возвращаем созданный объект WebSocket
    return socket;
}


function isConnected() {
    $("#loaderConnect").hide();
    $('#launcherConnectStatusName').removeClass('text-danger')
    $('#launcherConnectStatusName').addClass('text-white')
    $("#launcherConnectStatusName").text("Лаунчер");
}

function isDisnnected() {
    $("#loaderConnect").show();
    $('#launcherConnectStatusName').removeClass('text-white')
    $('#launcherConnectStatusName').addClass('text-danger')
    $("#launcherConnectStatusName").text("Подключение");
}

function firstRequest() {
    sendToLauncher({
        command: 'settingPatchData',
        'list': listPatch,
        'storage': storage,
        'enabled': enabledLauncher
    })
    sendToLauncher({
        command: 'getVersionLauncher'
    });
    sendToLauncher({
        command: 'getStatus'
    });
    getPathDirectoryChronicle()
    sendToLauncher({
        command: 'getDirectory', dirname: ".",
    });
    sendToLauncher({
        command: 'userLang',
        //TODO: Автоопределение языка
        lang: "ru"
    });
    sendToLauncher({
        command: 'getEvents',
    });
    sendToLauncher({
        command: 'getAllConfig',
    });
}

function sendToLauncher(obj) {
    socket.send(JSON.stringify(obj));
}

function getPathDirectoryChronicle() {
    sendToLauncher({
        command: 'getPathDirectoryChronicle',
        chronicle: chronicle,
        domain: domain,
        serverID: serverID,
    });
}


function responseMessage(event) {
    let response = JSON.parse(event.data);
    console.log(response)
    ResponseStatus(response);
    ResponseEvent(response);
    ResponseEventsLog(response);
    ResponseDirection(response);
    ResponseSaveDirectory(response);
    ResponseGetChronicleDirectory(response);
    ResponseGetAllConfig(response);
    ResponseGetVersionLauncher(response);
    ResponseError(response)
    ResponseGetClientWay(response)
}

function ResponseGetClientWay(response) {
    if (response.command !== "getClientWay") return;
    $("#settingWayTableInfo").html('');
    let html = ''
    response.chronicles.forEach((e) => {
        html += `<div class="block block-rounded">
            <div class="block-header block-header-default">
              <h3 class="block-title">` + e.name + `</h3>
            </div>
            <div class="block-content">
              <table class="table table-striped table-vcenter">
               <tbody> `
        e.directions.forEach((dir) => {
            html += `<tr id="clientWayID` + dir.id + `">
                      <td>` + dir.dir + `</td>
                      <td>
                        <div class="btn-toolbar justify-content-end">
                          <div class="btn-group">
                            <button type="button" class="btn btn-sm btn-secondary removeClientDir" data-dir-id="` + dir.id + `" data-bs-toggle="tooltip" title="Delete">
                              <i class="fa fa-times"></i>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    `
        })
        html += `</tbody>
              </table>
            </div>
          </div>`;

    })
    $("#settingWayTableInfo").append(html)
}

function ResponseStatus(response) {
    if (response.command !== "status") return;

    lastStatusID = response.status

    if (lastStatusID !== response.status && response.status === 0) {
        $('.chart').data('easyPieChart').update(0);
        $('.percent').text(0);
    }
    //Если идет загрузка списка, если идет сравнение файлов, если загрузка файлов
    let totalSize;
    let size;
    let filename;
    if (response.status === 0 || response.status === 1 || response.status === 2 || response.status === 3) {
        if (response.status === 0) {
            setUpdateClient(false);
        }

        //Если приходит запрос, уведомление что идет сравнение файлов
        if (response.status === 2) {
            setUpdateClient(true);
            percentPanel = ((response.loaded / response.filesTotal) * 100).toFixed(0);
            $('#processRunLevel').text(percentPanel + "%");
            $('#processName').text("Сравнение файлов");
            // $('#processName').text(percentPanel);
            // $('#processName').attr('data-original-title', checked_files + " " + response.loaded + " / " + response.filesTotal + " (" + ((response.loaded / response.filesTotal) * 100).toFixed(2) + "%)")
        }
        //Если приходит запрос, уведомление что идет загрузка файлов
        if (response.status === 3) {
            setUpdateClient(true);
            if (response.boot == null) {
                return
            }
            $('#processRunLevel').text(((response.loaded / response.filesTotal) * 100).toFixed(2) + "%");
            $('#processName').text("Загрузка файлов");

            for (let index = 0; index <= 4; index++) {
                if (typeof response.boot[index] !== 'undefined') {
                    resp = response.boot[index]
                    filename = resp.filename;
                    size = resp.size;
                    totalSize = resp.sizeTotal;
                } else {
                    filename = "Нет";
                    size = 0;
                    totalSize = 0;
                }
                console.log(resp)
                drawProgressBar(index, filename, size, totalSize)
            }

            // percentPanel = Math.floor((response.loaded / response.filesTotal) * 100).toFixed(0);
            // $('#processRunLevel').text(percentPanel + "%");


            // for (let index = 0; index < response.boot.length; ++index) {
            //     element = response.boot[index];
            //     percentage = ((response.boot[index].size / response.boot[index].sizeTotal) * 100).toFixed(2);
            //
            //     $("#download_status_filename_" + (index + 1)).attr('data-original-title', formatBytes(element.sizeTotal));
            //     $("#download_status_filename_" + (index + 1)).text(element.filename)
            //     $("#download_status_load_procent_" + (index + 1)).text(percentage + "%")
            //     $("#download_status_load_procent_csswidth_" + (index + 1)).css("width", Math.floor(percentage) + "%");
            //
            //     percentPanel = Math.floor((response.loaded / response.filesTotal) * 100).toFixed(0);
            //     $('#processRunLevel').text(percentPanel + "%");
            // }

        }
    } else if (response.status === 4) {
        setUpdateClient(false);
        // Codebase.helpers('jq-notify', {
        //     align: 'right',
        //     from: 'bottom',
        //     type: 'success',
        //     icon: 'fa fa-check me-1',
        //     message: 'Загрузка завершена. Запускайте игру.'
        // });
        console.log("Загрузка завершена")
        $('#processRunLevel').text("100%");
        $('#processName').text("Загрузка завершена");
    } else if (response.status === 5) {
        setUpdateClient(false);
        $('#processRunLevel').text("0%");
        $('#processName').text("Загрузка отменена");
        console.log("Загрузка отменена")
        // resetLoadPanel()
    } else if (response.status === 5) {
        setUpdateClient(false);
        $('#processName').text("Ошибка");
        // Codebase.helpers('jq-notify', {
        //     align: 'right',
        //     from: 'bottom',
        //     type: 'danger',
        //     icon: 'fa fa-check me-1',
        //     message: 'Ошибка загрузки'
        // });
        console.log("Произошла ошибка при загрузке")
        // resetLoadPanel()
    }

}

function HtmlAddProgressBar() {
    const color = ["primary", "success", "danger", "info", "secondary"];
    let progressBar = "";
    for (let index = 0; index <= 4; index++) {
        progressBar += `
        <div class="row fs-sm">
                    <div class="col-sm-6 order-sm-1 py-1 text-center text-sm-start" id="download_status_filename_${index}">Нет загрузки</div>
                    <div class="col-sm-6 order-sm-2 py-1 text-center text-sm-end" id="download_status_load_procent_${index}">0%</div>
                  </div>
                  <div class="progress push" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar progress-bar-striped progress-bar-animated bg-${color[index]}" id="download_status_load_procent_csswidth_${index}" style="width: 0%;">
                    </div>
                  </div>
         `;
    }
    $("#progressBarData").html(progressBar);
}

function drawProgressBar(index, filename, size, sizeTotal) {
    let percentage = 0;
    if (size !== 0 && sizeTotal !== 0) {
        percentage = ((size / sizeTotal) * 100).toFixed(2);
    }
    $("#download_status_filename_" + (index)).attr('data-original-title', formatBytes(sizeTotal));
    $("#download_status_filename_" + (index)).text(filename)
    $("#download_status_load_procent_" + (index)).text(percentage + "%")
    $("#download_status_load_procent_csswidth_" + (index)).css("width", Math.floor(percentage) + "%");
}

function ResponseEvent(response) {
    if (response.command !== "event") return;

    var date = new Date(response.time);
    var time = date.toLocaleTimeString();
    let color = "";
    if (response.level === 0) {
        color = "light";
    } else if (response.level === 1) {
        color = "primary";
    } else if (response.level === 2) {
        color = "secondary";
    } else if (response.level === 3) {
        color = "danger";
    } else if (response.level === 4) {
        color = "info";
    } else if (response.level === 5) {
        color = "success";
    }
    $('#eventNotification').prepend(`<tr>
                        <td class="d-none d-sm-table-cell">` + response.message + `</td>
                        <td class="d-none d-sm-table-cell text-end"><span>` + time + `</span></td>
                      </tr>`);
    console.log(response.message)
}

function ResponseEventsLog(response) {
    if (response.command !== "eventslog") return;
    for (let index = 0; index < response.events.length; ++index) {
        var date = new Date(response.events[index].time);
        var time = date.toLocaleTimeString();

        $('#eventNotification').prepend(`<tr>
                        <td class="d-none d-sm-table-cell">` + response.events[index].message + `</td>
                        <td class="d-none d-sm-table-cell text-end"><span>` + time + `</span></td>
                      </tr>`);
    }
}

function ResponseDirection(response) {
    if (response.command !== "directry") return;
    $("#dirfullpath").text(response.directory)
    $('.saveDirClient').attr('data-client-dir-path', response.directory)
    $("#dirlist").html("")
    $("#dirfullpath").html(parsePathToLinks(response.directory))
    image = "folder"
    if (response.directory === "") {
        image = "local_disk"
    }
    if (response.folders != null) {
        response.folders.forEach(function (elem) {
            $('#dirlist').append('<figure data-all-path="' + (elem) + '" class="cursor-pointer highlight direction"><img src="./assets/media/dir/' + image + '.png" style="width: 80px;" alt="Folder Icon"><figcaption class="name">' + dirname(elem) + '</figcaption></figure>');
        });
    } else {
        $("#dirlist").html("Тут больше нету папок.<br>Нажмите на кнопку <Сохранить> и мы сюда будем загружать клиент!")
    }
}

function ResponseSaveDirectory(response) {
    if (response.command !== "saveDirectory") return;

}

//Имеется ли директории для данных хроник
function ResponseGetChronicleDirectory(response) {
    if (response.command !== "getChronicleDirectory") return;
    if (response.clients !== "null") {
        $('#selectClient').empty();
        var clients = JSON.parse(response.clients);
        if (Array.isArray(clients)) {
            clients.forEach(function (elem) {
                var newOption = $('<option>', {
                    value: elem.id, text: elem.dir
                });
                if (elem.is_default === 1) {
                    newOption.prop('selected', true);
                }
                $('#selectClient').append(newOption);
            });
        } else {
            // Действия, которые нужно выполнить, если clients не является массивом
            // Например, добавление варианта по умолчанию или отображение сообщения об ошибке данных
        }
    } else {
        $('#selectClient').empty();
        // Действия, которые нужно выполнить, если response.clients равно null
        // Например, добавление варианта по умолчанию или отображение сообщения об отсутствии данных
    }
}

function ResponseGetAllConfig(response) {
    if (response.command !== "getAllConfig") return;
    $("#isClientFilesArchive").prop("checked", response.isClientFilesArchive ? true : false);
    $("#autoStartLauncher").prop("checked", response.autoStartLauncher ? true : false);
    $("#autoUpdateLauncher").prop("checked", response.autoUpdateLauncher ? true : false);
}

function ResponseGetVersionLauncher(response) {
    if (response.command !== "needClientUpdate") return;
    startUpdate()
}

function ResponseError(response) {
    if (response.command !== "error") return;
    Error(response.message)
}


//Начать обновление
function startUpdate() {
    if ($("#selectClient").val() !== null) {
        if (getUpdateClient()) {
            //Если клиент обновляется, тогда мы запросе, мы будем слать команду на отмену загрузки
            clientUpdateCancel()
            setUpdateClient(false);
        } else {
            let obj = {
                command: 'start_client_update',
                uid: domain,
                dirID: parseInt($("#selectClient").val()),
            };
            sendToLauncher(obj);
            setUpdateClient(true);
        }
    } else {
        OpenSelectDir()
    }
}

function setUpdateClient(loadupdate) {
    if (getUpdateClient() === loadupdate) return;
    if (loadupdate) {
        isUpdateClient = true;
        $("#startUpdateGame").text("Отменить обновление")
    } else {
        isUpdateClient = false;
        $("#startUpdateGame").text("Начать обновление")
    }

    for (let index = 0; index <= 4; index++) {
        $("#download_status_filename_" + (index)).attr('data-original-title', formatBytes(0));
        $("#download_status_filename_" + (index)).text("Нет")
        $("#download_status_load_procent_" + (index)).text("0%")
        $("#download_status_load_procent_csswidth_" + (index)).css("width", "0%");
    }

}

function getUpdateClient() {
    return isUpdateClient;
}


$('#selectClient').change(function () {
    obj = {
        command: 'setDefaultServer',
        id: parseInt($(this).val()),
        chronicle: chronicle,
        domain: domain,
        serverID: serverID,
    }
    sendToLauncher(obj)
});

function clientUpdateCancel() {
    let obj = {
        command: 'client_update_cancel',
    };
    sendToLauncher(obj);
}


function OpenSelectDir() {
    $("#selectDirClient").modal("show");
}

$(".startL2").on("click", function (event) {
    if ($("#selectClient").val() === null) {
        $("#selectDirClient").modal('show');
        return
    }
    obj = {
        command: 'startGame',
        application: l2exe,
        args: args,
        dirID: parseInt($("#selectClient").val()),
        uid: domain,
    }
    socket.send(JSON.stringify(obj));
});


function parsePathToLinks(path) {
    const pathParts = path.split("\\");
    let dirFoRefresh = path.replace(/\\$/, '');
    if (dirFoRefresh === "") {
        dirFoRefresh = ".";
    }
    let result = '<i data-all-path="." aria-hidden="true" class="fa fa-home linkdir"></i> ';
    result += `<i data-all-path="${dirFoRefresh}" aria-hidden="true" class="fa fa-refresh linkdir"></i> `;
    let currentPath = "";

    for (let i = 0; i < pathParts.length; i++) {
        currentPath += pathParts[i];
        result += `<span data-all-path="${currentPath}" class="linkdir">${pathParts[i]}</span>\\`;
        currentPath += "\\";
    }
    return result.replace(/\\$/g, '');
}

function dirname(path) {
    const separator = path.includes("/") ? "/" : "\\";
    const parts = path.split(separator).filter(part => part !== "");
    return parts[parts.length - 1];
}

function direction(dirname) {
    let obj = {
        command: 'getDirectory', dirname: dirname
    };
    sendToLauncher(obj)
}

$("#dirfullpath").on("click", ".linkdir", function () {
    allPath = $(this).attr("data-all-path");
    direction(allPath + "\\")
});

$("#dirlist").on("click", ".direction", function () {
    allPath = $(this).attr("data-all-path");
    direction(allPath)
});

function formatBytes(bytes) {
    if (bytes < 1024) {
        return bytes + " B";
    } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
    } else if (bytes < 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    } else if (bytes < 1024 * 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    } else {
        return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2) + " TB";
    }
}

$(document).on('click', '.saveDirClient', function () {
    $("#selectDirectoryModal").modal("hide");
    obj = {
        command: 'saveDirectoryClient',
        dir: $(this).attr('data-client-dir-path'),
        chronicle: chronicle,
        domain: domain,
        serverID: serverID,
    };
    sendToLauncher(obj)
    getPathDirectoryChronicle()
});

$(document).on('click', '#getClientWay', function () {
    getClientWay()
});

function getClientWay() {
    sendToLauncher({
        command: 'getClientWay'
    })
}

$(document).on('click', '.removeClientDir', function () {
    dirID = parseInt($(this).attr('data-dir-id'))
    obj = {
        command: 'removeClientDir',
        id: dirID,
        chronicle: chronicle,
    };
    sendToLauncher(obj)
    $("#clientWayID" + dirID).remove();
});

$("#isClientFilesArchive").on("click", function (event) {
    if (isConnect == false) {
        return
    }
    obj = {
        command: 'setConfig', param: 'isClientFilesArchive', value: $("#isClientFilesArchive").prop("checked"),
    };
    sendToLauncher(obj)
});

$("#autoStartLauncher").on("click", function (event) {
    if (isConnect == false) {
        return
    }
    obj = {
        command: 'setConfig', param: 'autoStartLauncher', value: $("#autoStartLauncher").prop("checked"),
    };
    sendToLauncher(obj)
});

$("#autoUpdateLauncher").on("click", function (event) {
    if (isConnect == false) {
        return
    }
    obj = {
        command: 'setConfig', param: 'autoUpdateLauncher', value: $("#autoUpdateLauncher").prop("checked"),
    };
    sendToLauncher(obj)
});