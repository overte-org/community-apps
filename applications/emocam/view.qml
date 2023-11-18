import QtQuick 2.7
import QtQuick.Controls 2.2
import QtWebChannel 1.0
import controls 1.0
import hifi.toolbars 1.0
import QtGraphicalEffects 1.0
import controlsUit 1.0 as HifiControls
import stylesUit 1.0

WebView {
    id: faceTrackingWebView
    url: Qt.resolvedUrl("./index.html")
    enabled: true
    blurOnCtrlShift: false
}
