<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Data alternatif bengkel beserta nilai matriks keputusan (skala 1-5)
// C1=Harga Servis, C2=Kualitas Pelayanan, C3=Kelengkapan Peralatan, C4=Jarak Lokasi, C5=Waktu Pengerjaan
$bengkel = [
    ["id"=>1, "kode"=>"A1", "nama"=>"San Motor PDG",     "c1"=>2, "c2"=>5, "c3"=>4, "c4"=>5, "c5"=>4],
    ["id"=>2, "kode"=>"A2", "nama"=>"Mahkota Jaya Motor","c1"=>4, "c2"=>4, "c3"=>3, "c4"=>4, "c5"=>3],
    ["id"=>3, "kode"=>"A3", "nama"=>"Champion Motor",    "c1"=>2, "c2"=>5, "c3"=>5, "c4"=>5, "c5"=>5],
    ["id"=>4, "kode"=>"A4", "nama"=>"Hengspeed",         "c1"=>3, "c2"=>4, "c3"=>4, "c4"=>2, "c5"=>2],
    ["id"=>5, "kode"=>"A5", "nama"=>"Bengkel HaiMotor",  "c1"=>5, "c2"=>3, "c3"=>3, "c4"=>4, "c5"=>3]
];

echo json_encode($bengkel);
?>
