import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SyncStatus } from "@/components/sync-status";
import { useDatabase, useLocalDatabase } from "@/contexts/database-context";
import { usePDFExport } from "@/hooks/use-pdf-export";
import { TABLES } from "@/lib/database";

interface Tender {
  id: string;
  title_en: string;
  title_bn: string;
  organization_en: string;
  organization_bn: string;
  amount: number;
  deadline: string;
  risk_score: number;
  risk_flags: string;
  submission_start: string;
  submission_end: string;
  tender_type: string;
  procurement_method: string;
  created_at: string;
}

interface FilterState {
  riskLevel: "all" | "low" | "medium" | "high";
  tenderType: "all" | "goods" | "services" | "works";
  amountRange: "all" | "small" | "medium" | "large";
  sortBy: "date" | "amount" | "risk" | "deadline";
  sortOrder: "asc" | "desc";
}

export default function ProcurementScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  const { exportTenderList, isExporting } = usePDFExport();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [filteredTenders, setFilteredTenders] = useState<Tender[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    riskLevel: "all",
    tenderType: "all",
    amountRange: "all",
    sortBy: "date",
    sortOrder: "desc",
  });

  const isEnglish = i18n.language === "en";

  useEffect(() => {
    if (isInitialized) {
      loadTenders();
    }
  }, [isInitialized]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [tenders, searchQuery, filters]);

  const loadTenders = async () => {
    try {
      setIsLoading(true);

      if (!isInitialized) {
        console.log("Database not initialized yet");
        return;
      }

      const db = useLocalDatabase();

      const result = await db.getAllAsync<Tender>(
        `SELECT * FROM ${TABLES.TENDERS} ORDER BY created_at DESC LIMIT 100`
      );

      console.log(`Loaded ${result.length} tenders from database`);
      setTenders(result);
    } catch (error) {
      console.error("Failed to load tenders:", error);
      Alert.alert(
        t("common.error"),
        "Failed to load tenders from local database"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTenders();
    setRefreshing(false);
  };

  const handleExportList = async () => {
    try {
      await exportTenderList(filteredTenders);
    } catch (error) {
      console.error("Failed to export tender list:", error);
      Alert.alert(t("common.error"), "Failed to export tender list");
    }
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...tenders];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tender) =>
          tender.title_en.toLowerCase().includes(query) ||
          tender.title_bn.toLowerCase().includes(query) ||
          tender.organization_en.toLowerCase().includes(query) ||
          tender.organization_bn.toLowerCase().includes(query)
      );
    }

    // Apply risk level filter
    if (filters.riskLevel !== "all") {
      filtered = filtered.filter((tender) => {
        const risk = tender.risk_score;
        switch (filters.riskLevel) {
          case "low":
            return risk < 30;
          case "medium":
            return risk >= 30 && risk < 70;
          case "high":
            return risk >= 70;
          default:
            return true;
        }
      });
    }

    // Apply tender type filter
    if (filters.tenderType !== "all") {
      filtered = filtered.filter(
        (tender) => tender.tender_type.toLowerCase() === filters.tenderType
      );
    }

    // Apply amount range filter
    if (filters.amountRange !== "all") {
      filtered = filtered.filter((tender) => {
        const amount = tender.amount;
        switch (filters.amountRange) {
          case "small":
            return amount < 1_000_000; // < 10 lakh
          case "medium":
            return amount >= 1_000_000 && amount < 10_000_000; // 10 lakh - 1 crore
          case "large":
            return amount >= 10_000_000; // > 1 crore
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case "date":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "risk":
          comparison = a.risk_score - b.risk_score;
          break;
        case "deadline":
          comparison =
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
      }

      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

    setFilteredTenders(filtered);
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return "#dc2626"; // High risk - red
    if (riskScore >= 30) return "#ea580c"; // Medium risk - orange
    return "#84cc16"; // Low risk - green
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore >= 70) return "High Risk";
    if (riskScore >= 30) return "Medium Risk";
    return "Low Risk";
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10_000_000) {
      return `${(amount / 10_000_000).toFixed(1)}${isEnglish ? " Cr" : " কোটি"}`;
    }
    if (amount >= 100_000) {
      return `${(amount / 100_000).toFixed(1)}${isEnglish ? " Lakh" : " লক্ষ"}`;
    }
    return amount.toLocaleString();
  };

  const renderTenderCard = ({
    item,
    index,
  }: {
    item: Tender;
    index: number;
  }) => (
    <MotiView
      animate={{ opacity: 1, translateY: 0 }}
      className="mb-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      from={{ opacity: 0, translateY: 20 }}
      transition={{ type: "timing", duration: 600, delay: index * 100 }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          router.push(`/tender-detail?id=${item.id}`);
        }}
      >
        {/* Header with risk score */}
        <View className="mb-3 flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className="font-bold text-gray-900 text-lg dark:text-white">
              {isEnglish ? item.title_en : item.title_bn}
            </Text>
            <Text className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              {isEnglish ? item.organization_en : item.organization_bn}
            </Text>
          </View>

          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: getRiskColor(item.risk_score) + "20" }}
          >
            <Text
              className="font-bold text-xs"
              style={{ color: getRiskColor(item.risk_score) }}
            >
              {item.risk_score}%
            </Text>
          </View>
        </View>

        {/* Details */}
        <View className="space-y-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons color="#6b7280" name="cash" size={16} />
              <Text className="ml-1 text-gray-600 text-sm dark:text-gray-400">
                {formatAmount(item.amount)}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons color="#6b7280" name="time" size={16} />
              <Text className="ml-1 text-gray-600 text-sm dark:text-gray-400">
                {new Date(item.deadline).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 text-xs dark:bg-gray-700 dark:text-gray-300">
              {item.tender_type}
            </Text>

            <Text
              className="font-medium text-xs"
              style={{ color: getRiskColor(item.risk_score) }}
            >
              {getRiskLabel(item.risk_score)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  const renderFilterChip = (
    label: string,
    active: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      className={`mr-2 rounded-full px-3 py-2 ${
        active ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-700"
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-medium text-xs ${
          active ? "text-white" : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getStats = () => {
    const total = tenders.length;
    const highRisk = tenders.filter((t) => t.risk_score >= 70).length;
    const mediumRisk = tenders.filter(
      (t) => t.risk_score >= 30 && t.risk_score < 70
    ).length;
    const lowRisk = tenders.filter((t) => t.risk_score < 30).length;

    return { total, highRisk, mediumRisk, lowRisk };
  };

  const stats = getStats();

  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">
          {t("common.loading")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Sync Status Banner */}
      <SyncStatus variant="banner" />

      {/* Header with Stats */}
      <View className="border-gray-200 border-b bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-bold text-gray-900 text-xl dark:text-white">
            {t("modules.procureLens.name")}
          </Text>

          <View className="flex-row space-x-2">
            <TouchableOpacity
              className="flex-row items-center rounded-full bg-green-100 px-3 py-2 dark:bg-green-800"
              disabled={isExporting || filteredTenders.length === 0}
              onPress={handleExportList}
            >
              {isExporting ? (
                <MotiView
                  animate={{ rotate: "360deg" }}
                  transition={{ type: "timing", duration: 1000, loop: true }}
                >
                  <Ionicons color="#059669" name="sync" size={16} />
                </MotiView>
              ) : (
                <Ionicons color="#059669" name="download" size={16} />
              )}
              <Text className="ml-1 text-green-700 text-sm dark:text-green-300">
                {isExporting ? "Exporting..." : "Export"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-700"
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons color="#6b7280" name="options" size={16} />
              <Text className="ml-1 text-gray-600 text-sm dark:text-gray-400">
                {t("common.filter")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="font-bold text-gray-900 text-lg dark:text-white">
              {stats.total}
            </Text>
            <Text className="text-gray-600 text-xs dark:text-gray-400">
              Total
            </Text>
          </View>

          <View className="items-center">
            <Text className="font-bold text-lg text-red-600">
              {stats.highRisk}
            </Text>
            <Text className="text-gray-600 text-xs dark:text-gray-400">
              High Risk
            </Text>
          </View>

          <View className="items-center">
            <Text className="font-bold text-lg text-orange-600">
              {stats.mediumRisk}
            </Text>
            <Text className="text-gray-600 text-xs dark:text-gray-400">
              Medium
            </Text>
          </View>

          <View className="items-center">
            <Text className="font-bold text-green-600 text-lg">
              {stats.lowRisk}
            </Text>
            <Text className="text-gray-600 text-xs dark:text-gray-400">
              Low Risk
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View className="border-gray-200 border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-700">
          <Ionicons color="#6b7280" name="search" size={20} />
          <TextInput
            className="ml-2 flex-1 text-gray-900 dark:text-white"
            onChangeText={setSearchQuery}
            placeholder={t("modules.procureLens.searchPlaceholder")}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons color="#6b7280" name="close-circle" size={20} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Bar */}
      {showFilters && (
        <View className="border-gray-200 border-b bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {renderFilterChip("All Risk", filters.riskLevel === "all", () =>
                setFilters((prev) => ({ ...prev, riskLevel: "all" }))
              )}
              {renderFilterChip("High Risk", filters.riskLevel === "high", () =>
                setFilters((prev) => ({ ...prev, riskLevel: "high" }))
              )}
              {renderFilterChip(
                "Medium Risk",
                filters.riskLevel === "medium",
                () => setFilters((prev) => ({ ...prev, riskLevel: "medium" }))
              )}
              {renderFilterChip("Low Risk", filters.riskLevel === "low", () =>
                setFilters((prev) => ({ ...prev, riskLevel: "low" }))
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Tender List */}
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={filteredTenders}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons color="#9ca3af" name="document-text-outline" size={64} />
            <Text className="mt-4 text-center text-gray-500 dark:text-gray-400">
              {isLoading
                ? t("common.loading")
                : t("modules.procureLens.noTenders")}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl onRefresh={onRefresh} refreshing={refreshing} />
        }
        renderItem={renderTenderCard}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
