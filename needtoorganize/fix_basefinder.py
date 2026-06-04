import sys

with open('src/components/BaseFinder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = lines[:643]

replacement = """                        {/* Doprava Tab Content */}
                        {activeTab === 'doprava' && (
                            <div className={styles.tabContent}>
                                <div className={styles.dopravSection}>
                                    {/* Trip Planner */}
                                    <div className={styles.tripPlanner}>
                                        <h3>Plánování cesty</h3>
                                        <div className={styles.tripForm}>
                                            <div className={styles.formRow}>
                                                <div className={styles.formGroup}>
                                                    <label>Ze stanice:</label>
                                                    <div className={styles.inputWithButton}>
                                                        <input 
                                                            type="text"
                                                            value={selectedStation}
                                                            onChange={(e) => setSelectedStation(e.target.value)}
                                                            placeholder="Vyberte stanici"
                                                            className={styles.input}
                                                        />
                                                        <button
                                                            type="button"
                                                            className={styles.stationPickerButton}
                                                            onClick={() => setIsStationPickerOpen(!isStationPickerOpen)}
                                                            title="Nejbližší stanice"
                                                        >
                                                            #
                                                        </button>
                                                        {isStationPickerOpen && (
                                                            <div className={styles.stationPickerPopup}>
                                                                <div className={styles.stationPickerHeader}>Nejbližší stanice</div>
                                                                {selectedBaseData.stations && selectedBaseData.stations.length > 0 ? (
                                                                    <div className={styles.stationPickerList}>
                                                                        {selectedBaseData.stations.slice(0, 10).map((station: any) => (
                                                                            <div 
                                                                                key={station._id} 
                                                                                className={`${styles.stationItem} ${selectedStation === station.name ? styles.stationItemSelected : ''}`}
                                                                                onClick={() => {
                                                                                    setSelectedStation(station.name);
                                                                                    setIsStationPickerOpen(false);
                                                                                }}
                                                                            >
                                                                                <div className={styles.stationRank}>#{station.rank}</div>
                                                                                <div className={styles.stationInfo}>
                                                                                    <div className={styles.stationName}>{station.name}</div>
                                                                                    <div className={styles.stationDetails}>
                                                                                        <span className={styles.stationType}>{station.type}</span>
                                                                                        <span className={styles.stationDistance}>{station.distanceKm.toFixed(1)} km</span>
                                                                                        {station.transportModes && station.transportModes.length > 0 && (
                                                                                            <span className={styles.stationModes}>
                                                                                                {station.transportModes.join(', ')}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className={styles.stationPickerEmpty}>Žádné dopravní stanice v blízkosti</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Do města:</label>
                                                    <input 
                                                        type="text"
                                                        value={destinationCity}
                                                        onChange={(e) => setDestinationCity(e.target.value)}
                                                        placeholder="např. Praha"
                                                        className={styles.input}
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.formRow}>
                                                <div className={styles.formGroup}>
                                                    <label>Datum:</label>
                                                    <input 
                                                        type="date"
"""

for line in replacement.split('\n')[:-1]:
    new_lines.append(line + '\n')

new_lines.extend(lines[645:])

with open('src/components/BaseFinder.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
